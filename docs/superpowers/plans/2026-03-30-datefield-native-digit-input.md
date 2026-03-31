# DateField Native-Like Digit Input — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match native browser date field digit input: show the typed value (including out-of-range) while focused, correct to max only on blur; no fast-advance on single digits.

**Architecture:** Two changes to `DateField.ts`. In `_handleDigit`, remove the fast-advance branch and split the two-digit path — in-range values commit immediately, out-of-range values are displayed but deferred to `_flushDigitBuffer` on blur. In `_handleSegmentKey`, the Backspace case clears `_digitBuffer` and cancels the timer so a buffered-but-unseen digit cannot be committed to the wrong segment after a clear.

**Tech Stack:** TypeScript (strict), Vitest + jsdom. Run tests with `npm run test:unit`.

---

## File Map

| File | Change |
|---|---|
| `tests/DateField.unit.test.ts` | Update 2 existing tests; add 5 new tests |
| `src/partials/components/DateField/DateField.ts` | Refactor `_handleDigit` (lines 524–541); fix Backspace case (lines 406–410) |

---

### Task 1: Update existing tests and add new failing tests

Two tests written in the previous plan assumed immediate clamping on the second digit. They must be updated to reflect the new blur-deferred behavior. Five new tests cover the native-like behavior that currently fails.

**Files:**
- Modify: `tests/DateField.unit.test.ts`

- [ ] **Step 1: Update the two existing clamping tests to add blur**

In `describe('DateField — segment digit clamping')`, update both tests to dispatch a blur event before asserting `aria-valuenow`. The test descriptions also change to include "on blur".

Find and replace the first test:

**Old:**
```typescript
  it('day: typing "3" then "4" clamps to 31 (max days when no month set)', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
    expect(daySeg.getAttribute('aria-valuenow')).toBe('31')
    el.remove()
  })
```

**New:**
```typescript
  it('day: typing "3" then "4" clamps to 31 on blur', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
    daySeg.dispatchEvent(new FocusEvent('blur'))
    expect(daySeg.getAttribute('aria-valuenow')).toBe('31')
    el.remove()
  })
```

Find and replace the second test:

**Old:**
```typescript
  it('month: typing "1" then "3" clamps to 12', () => {
    const { el } = makeField()
    const monthSeg = el.querySelector('[data-segment="month"]')! as HTMLElement
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
    expect(monthSeg.getAttribute('aria-valuenow')).toBe('12')
    el.remove()
  })
```

**New:**
```typescript
  it('month: typing "1" then "3" clamps to 12 on blur', () => {
    const { el } = makeField()
    const monthSeg = el.querySelector('[data-segment="month"]')! as HTMLElement
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
    monthSeg.dispatchEvent(new FocusEvent('blur'))
    expect(monthSeg.getAttribute('aria-valuenow')).toBe('12')
    el.remove()
  })
```

- [ ] **Step 2: Add five new failing tests at the end of the test file**

Append after the last `describe` block:

```typescript
describe('DateField — native-like digit input (show then blur-correct)', () => {
  it('day: single digit "4" does not fast-advance — no immediate commit', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
    expect(daySeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })

  it('day: typing "4" then "5" shows "45" in textContent without committing', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }))
    expect(daySeg.textContent).toBe('45')
    expect(daySeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })

  it('day: typing "4" then "5" then blur clamps to 31', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }))
    daySeg.dispatchEvent(new FocusEvent('blur'))
    expect(daySeg.getAttribute('aria-valuenow')).toBe('31')
    el.remove()
  })

  it('month: typing "1" then "3" shows "13" in textContent without committing', () => {
    const { el } = makeField()
    const monthSeg = el.querySelector('[data-segment="month"]')! as HTMLElement
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    monthSeg.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
    expect(monthSeg.textContent).toBe('13')
    expect(monthSeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })

  it('day: Backspace after typing clears buffer so blur does not commit', () => {
    const { el } = makeField()
    const daySeg = el.querySelector('[data-segment="day"]')! as HTMLElement
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    daySeg.dispatchEvent(new FocusEvent('blur'))
    expect(daySeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })
})
```

- [ ] **Step 3: Run the test suite to confirm the right tests fail**

```bash
npm run test:unit 2>&1 | tail -20
```

Expected outcome:
- The two updated clamping tests now **pass** (blur was added, behavior is already correct via `_flushDigitBuffer`).
- The 5 new tests in `'native-like digit input'` all **fail**:
  - `'single digit "4" does not fast-advance'` — fails because `4` currently fast-advances and removes `data-placeholder`
  - `'"4" then "5" shows "45"'` — fails because `"45"` shows `"05"` (fast-advance commits `4`, then `5` is fresh)
  - `'"4" then "5" then blur clamps to 31'` — fails because `aria-valuenow` is `"5"` not `"31"`
  - `'"1" then "3" shows "13"'` — fails because `"13"` is immediately clamped to `"12"`
  - `'Backspace clears buffer'` — fails because buffer `"4"` persists after Backspace, so blur commits day=4 and removes `data-placeholder`

Total failures expected: 5.

---

### Task 2: Refactor `_handleDigit` and fix Backspace

**Files:**
- Modify: `src/partials/components/DateField/DateField.ts`

- [ ] **Step 1: Replace the day/month section of `_handleDigit`**

Find the day/month section in `_handleDigit` (the block after the `if (type === 'year')` guard):

**Old (lines ~524–541):**
```typescript
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
```

**New:**
```typescript
    // day or month — 1 or 2 digit segments
    if (len === 2) {
      if (num >= min && num <= max) {
        // In range: commit immediately and advance (responsive for valid input)
        this._setSegmentValue(seg, num)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      }
      // Out of range: buffer already shown by _showBuffer above.
      // Stay on segment — _flushDigitBuffer corrects on blur.
    } else {
      // Single digit: always wait for second digit or blur.
      // No fast-advance — the user may intend to follow with a second digit.
      this._digitTimer = setTimeout(() => {
        this._setSegmentValue(seg, Math.max(min, Math.min(max, num)))
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      }, 1000)
    }
```

- [ ] **Step 2: Fix the Backspace case in `_handleSegmentKey`**

Find the Backspace case (lines ~406–410):

**Old:**
```typescript
      case 'Backspace':
        e.preventDefault()
        this._clearSegment(seg)
        this._moveSegmentFocus(seg, -1)
        break
```

**New:**
```typescript
      case 'Backspace':
        e.preventDefault()
        clearTimeout(this._digitTimer ?? undefined)
        this._digitTimer = null
        this._digitBuffer = ''
        this._clearSegment(seg)
        this._moveSegmentFocus(seg, -1)
        break
```

- [ ] **Step 3: Run the target tests to confirm they pass**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A2 "native-like digit input"
```

Expected: all 5 tests in `'native-like digit input'` pass.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
npm run test:unit
```

Expected: all 88 tests pass (83 existing + 5 new).

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/partials/components/DateField/DateField.ts tests/DateField.unit.test.ts
git commit -m "$(cat <<'EOF'
fix(DateField): native-like digit input — show typed value, correct on blur

- Remove fast-advance: single digits no longer auto-commit for values
  >= threshold; every single digit waits for a second digit or blur
- Out-of-range two-digit values (e.g. "45", "13") are displayed as typed
  and corrected by _flushDigitBuffer on blur, matching native behaviour
- In-range two-digit values still commit immediately and advance
- Backspace now clears _digitBuffer and cancels the pending timer so a
  buffered digit cannot be committed to the wrong segment after a clear

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
