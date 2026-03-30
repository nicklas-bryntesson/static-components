# DateField Segment Input — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four segment input bugs — overflow clamping bypass, invisible digit buffering, missing blur flush, and no cross-segment day re-clamp on month change.

**Architecture:** Refactor `_handleDigit` to dispatch on buffer length first (not digit value), add `_showBuffer` for immediate visual feedback, add `_flushDigitBuffer` for blur commit/clear, and extend the month path in `_setSegmentValue` to re-clamp day.

**Tech Stack:** TypeScript (strict), Vitest + jsdom for unit tests. Run tests with `npm run test:unit`.

---

## File Map

| File | Change |
|---|---|
| `tests/DateField.unit.test.ts` | Add failing tests before each implementation task |
| `src/partials/components/DateField/DateField.ts` | Add `_showBuffer`, `_flushDigitBuffer`; refactor `_handleDigit`; update `_bindSegmentEvents` blur handler; extend `_setSegmentValue` month path |

---

### Task 1: Write failing tests for digit clamping and visual buffer feedback

**Files:**
- Modify: `tests/DateField.unit.test.ts` (append after the last `describe` block)

- [ ] **Step 1: Append the two new `describe` blocks to the test file**

Add at the very end of `tests/DateField.unit.test.ts`:

```typescript
describe('DateField — segment digit clamping', () => {
  it('day: typing "3" then "4" clamps to 31 (max days when no month set)', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
    expect(daySeg.getAttribute('aria-valuenow')).toBe('31')
    el.remove()
  })

  it('month: typing "1" then "3" clamps to 12', () => {
    const { el } = makeField()
    const monthSeg = el.querySelector('[data-segment="month"]')! as HTMLElement
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
    expect(monthSeg.getAttribute('aria-valuenow')).toBe('12')
    el.remove()
  })
})

describe('DateField — segment visual buffer feedback', () => {
  it('day: shows typed digit immediately in textContent before commit', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    expect(daySeg.textContent).toBe('1')
    el.remove()
  })

  it('year: shows partial digits immediately during accumulation', () => {
    const { el } = makeField()
    const yearSeg = el.querySelector('[data-segment="year"]')! as HTMLElement
    for (const digit of ['2', '0', '2']) {
      yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: digit, bubbles: true }))
    }
    expect(yearSeg.textContent).toBe('202')
    el.remove()
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A3 "segment digit clamping\|visual buffer"
```

Expected: both `describe` blocks show failing tests. The clamping test will fail because "34" is committed directly. The visual test will fail because `textContent` is still "dd"/"yyyy".

---

### Task 2: Add `_showBuffer` helper and refactor `_handleDigit`

**Files:**
- Modify: `src/partials/components/DateField/DateField.ts` — replace `_handleDigit` (lines 498–547), add `_showBuffer` after it

- [ ] **Step 1: Replace `_handleDigit` with the length-first implementation**

Find and replace the entire `_handleDigit` method (the block from `_handleDigit(seg: HTMLSpanElement, digit: string): void {` through its closing `}`):

**Old (lines 498–547):**
```typescript
  _handleDigit(seg: HTMLSpanElement, digit: string): void {
    const type = seg.dataset.segment as SegmentType
    clearTimeout(this._digitTimer ?? undefined)
    this._digitBuffer += digit
    const num = Number(this._digitBuffer)

    if (type === 'day') {
      if (num > 3) {
        this._setSegmentValue(seg, num)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      } else if (this._digitBuffer.length === 2) {
        const clamped = Math.min(num, this._getSegmentLimits('day').max)
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      } else {
        this._digitTimer = setTimeout(() => {
          this._setSegmentValue(seg, num)
          this._digitBuffer = ''
          this._moveSegmentFocus(seg, 1)
        }, 1000)
      }
    } else if (type === 'month') {
      if (num > 1) {
        this._setSegmentValue(seg, num)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      } else if (this._digitBuffer.length === 2) {
        const clamped = Math.max(1, Math.min(num, 12))
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      } else {
        this._digitTimer = setTimeout(() => {
          this._setSegmentValue(seg, Math.max(1, num))
          this._digitBuffer = ''
          this._moveSegmentFocus(seg, 1)
        }, 1000)
      }
    } else if (type === 'year') {
      if (this._digitBuffer.length === 4) {
        const limits = this._getSegmentLimits('year')
        const clamped = Math.max(limits.min, Math.min(limits.max, num))
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      }
    }
  }
```

**New:**
```typescript
  _handleDigit(seg: HTMLSpanElement, digit: string): void {
    const type = seg.dataset.segment as SegmentType
    clearTimeout(this._digitTimer ?? undefined)
    this._digitBuffer += digit
    const num = Number(this._digitBuffer)
    const len = this._digitBuffer.length
    const { min, max } = this._getSegmentLimits(type)

    this._showBuffer(seg, this._digitBuffer)

    if (type === 'year') {
      if (len === 4) {
        this._setSegmentValue(seg, Math.max(min, Math.min(max, num)))
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      }
      return
    }

    // day or month — 1 or 2 digit segments
    const fastThreshold = type === 'day' ? 4 : 2

    if (len === 2) {
      this._setSegmentValue(seg, Math.max(min, Math.min(max, num)))
      this._digitBuffer = ''
      this._moveSegmentFocus(seg, 1)
    } else if (num >= fastThreshold) {
      this._setSegmentValue(seg, Math.max(min, Math.min(max, num)))
      this._digitBuffer = ''
      this._moveSegmentFocus(seg, 1)
    } else {
      this._digitTimer = setTimeout(() => {
        this._setSegmentValue(seg, Math.max(min, Math.min(max, num)))
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      }, 1000)
    }
  }
```

- [ ] **Step 2: Add `_showBuffer` immediately after `_handleDigit`**

After the closing `}` of `_handleDigit`, insert:

```typescript
  _showBuffer(seg: HTMLSpanElement, buffer: string): void {
    // Update visual display only — do not touch data-placeholder or aria-valuenow
    // so _getCurrentSegmentValue still returns null until _setSegmentValue commits.
    seg.textContent = buffer
    seg.setAttribute('aria-valuetext', buffer)
  }
```

- [ ] **Step 3: Run the clamping and visual tests**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A3 "segment digit clamping\|visual buffer"
```

Expected: all 4 tests pass.

- [ ] **Step 4: Run the full unit test suite to verify no regressions**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.ts tests/DateField.unit.test.ts
git commit -m "$(cat <<'EOF'
fix(DateField): length-first digit dispatch with uniform clamping and visual buffer feedback

- _handleDigit now branches on buffer length first, so two-digit
  values always pass through the clamping path (fixes day=34, month=13)
- _showBuffer sets textContent immediately on each keypress so digits
  are visible during accumulation
- Clamping applied in every branch via Math.max(min, Math.min(max, num))

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Write failing tests for blur flush

**Files:**
- Modify: `tests/DateField.unit.test.ts` (append after the visual buffer describe block)

- [ ] **Step 1: Append the blur flush `describe` block**

```typescript
describe('DateField — segment blur flush', () => {
  it('day: single digit "0" on blur clamps to 1 (min)', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }))
    daySeg.dispatchEvent(new FocusEvent('blur'))
    expect(daySeg.getAttribute('aria-valuenow')).toBe('1')
    el.remove()
  })

  it('day: single digit "3" on blur commits value 3', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
    daySeg.dispatchEvent(new FocusEvent('blur'))
    expect(daySeg.getAttribute('aria-valuenow')).toBe('3')
    el.remove()
  })

  it('month: single digit "1" on blur commits value 1', () => {
    const { el } = makeField()
    const monthSeg = el.querySelector('[data-segment="month"]')! as HTMLElement
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    monthSeg.dispatchEvent(new FocusEvent('blur'))
    expect(monthSeg.getAttribute('aria-valuenow')).toBe('1')
    el.remove()
  })

  it('year: fewer than 4 digits on blur resets to placeholder', () => {
    const { el } = makeField()
    const yearSeg = el.querySelector('[data-segment="year"]')! as HTMLElement
    for (const digit of ['2', '0', '2']) {
      yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: digit, bubbles: true }))
    }
    yearSeg.dispatchEvent(new FocusEvent('blur'))
    expect(yearSeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A3 "segment blur flush"
```

Expected: all 4 tests fail — blur currently does nothing to the buffer.

---

### Task 4: Add `_flushDigitBuffer` and wire into blur handler

**Files:**
- Modify: `src/partials/components/DateField/DateField.ts`
  - Add `_flushDigitBuffer` after `_showBuffer`
  - Update blur handler in `_bindSegmentEvents` (line ~353)

- [ ] **Step 1: Add `_flushDigitBuffer` after `_showBuffer`**

After the closing `}` of `_showBuffer`, insert:

```typescript
  _flushDigitBuffer(seg: HTMLSpanElement): void {
    if (!this._digitBuffer) return
    clearTimeout(this._digitTimer ?? undefined)
    this._digitTimer = null
    const type = seg.dataset.segment as SegmentType
    const num = Number(this._digitBuffer)
    if (type === 'year' && this._digitBuffer.length < 4) {
      this._clearSegment(seg)
    } else {
      const { min, max } = this._getSegmentLimits(type)
      this._setSegmentValue(seg, Math.max(min, Math.min(max, num)))
    }
    this._digitBuffer = ''
  }
```

- [ ] **Step 2: Update the blur handler in `_bindSegmentEvents`**

Find:
```typescript
      const blurHandler = () => seg.removeAttribute('data-focused')
```

Replace with:
```typescript
      const blurHandler = () => {
        seg.removeAttribute('data-focused')
        this._flushDigitBuffer(seg)
      }
```

- [ ] **Step 3: Run the blur flush tests**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A3 "segment blur flush"
```

Expected: all 4 tests pass.

- [ ] **Step 4: Run the full unit test suite**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.ts tests/DateField.unit.test.ts
git commit -m "$(cat <<'EOF'
fix(DateField): flush digit buffer on segment blur

- _flushDigitBuffer cancels pending timer and commits partial day/month
  input clamped to [min, max]; resets year to placeholder if < 4 digits
- Blur handler in _bindSegmentEvents calls _flushDigitBuffer so partial
  input is never left in an uncommitted state

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Write failing tests for cross-segment day re-clamp

**Files:**
- Modify: `tests/DateField.unit.test.ts` (append after the blur flush describe block)

- [ ] **Step 1: Append the cross-segment re-clamp `describe` block**

```typescript
describe('DateField — cross-segment day re-clamp on month change', () => {
  it('re-clamps day to new month max when month is set to a shorter month', () => {
    const { el, instance } = makeField()
    instance._setSegmentValue(instance._getSegmentEl('day')!, 31)
    instance._setSegmentValue(instance._getSegmentEl('year')!, 2026)
    instance._setSegmentValue(instance._getSegmentEl('month')!, 2) // February 2026 = 28 days
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-valuenow')).toBe('28')
    el.remove()
  })

  it('does not alter day when it is within the new month max', () => {
    const { el, instance } = makeField()
    instance._setSegmentValue(instance._getSegmentEl('day')!, 15)
    instance._setSegmentValue(instance._getSegmentEl('year')!, 2026)
    instance._setSegmentValue(instance._getSegmentEl('month')!, 2) // February — 15 is valid
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-valuenow')).toBe('15')
    el.remove()
  })

  it('re-clamps to 29 for February in a leap year', () => {
    const { el, instance } = makeField()
    instance._setSegmentValue(instance._getSegmentEl('day')!, 31)
    instance._setSegmentValue(instance._getSegmentEl('year')!, 2024) // leap year
    instance._setSegmentValue(instance._getSegmentEl('month')!, 2)
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-valuenow')).toBe('29')
    el.remove()
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A3 "cross-segment day re-clamp"
```

Expected: all 3 tests fail — day is currently not re-clamped when month changes.

---

### Task 6: Add cross-segment re-clamp to `_setSegmentValue`

**Files:**
- Modify: `src/partials/components/DateField/DateField.ts` — month path in `_setSegmentValue` (lines ~472–476)

- [ ] **Step 1: Extend the month path in `_setSegmentValue`**

Find the existing block inside `_setSegmentValue` where the month path updates the day segment's `aria-valuemax`:

```typescript
      const daySeg = this._getSegmentEl('day')
      if (daySeg) {
        const daysInMonth = getDaysInMonth(year, numericValue - 1)
        daySeg.setAttribute('aria-valuemax', String(daysInMonth))
      }
```

Replace with:

```typescript
      const daySeg = this._getSegmentEl('day')
      if (daySeg) {
        const daysInMonth = getDaysInMonth(year, numericValue - 1)
        daySeg.setAttribute('aria-valuemax', String(daysInMonth))
        const currentDay = this._getCurrentSegmentValue(daySeg)
        if (currentDay !== null && currentDay > daysInMonth) {
          this._setSegmentValue(daySeg, daysInMonth)
        }
      }
```

- [ ] **Step 2: Run the cross-segment tests**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A3 "cross-segment day re-clamp"
```

Expected: all 3 tests pass.

- [ ] **Step 3: Run the full unit test suite**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/partials/components/DateField/DateField.ts tests/DateField.unit.test.ts
git commit -m "$(cat <<'EOF'
fix(DateField): re-clamp day segment when month changes to a shorter month

When _setSegmentValue commits a new month, any existing day value
that exceeds the new month's max days is corrected to the new max.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run the full unit test suite one last time**

```bash
npm run test:unit
```

Expected: all tests pass with no failures or skipped tests.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no TypeScript errors.
