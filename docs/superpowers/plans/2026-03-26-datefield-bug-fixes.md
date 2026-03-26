# DateField Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five behavioral bugs in `DateField.js`: disabled-state interactivity, missing initial-value sync, year segment not auto-advancing, year limits ignoring data-min/max, and segment input committing out-of-range dates.

**Architecture:** All fixes are isolated changes to `DateField.js`. No new files. Tests are added to the existing `tests/DateField.unit.test.js`. Each bug is a separate task with its own failing test → fix → commit cycle.

**Tech Stack:** Vanilla JS, Vitest + jsdom (unit tests), `npm run test:unit`

> **Note:** Task 7 (locale-derived segment order — `Intl.DateTimeFormat.formatToParts`) is a separate architectural plan that should follow this one. Fixing these bugs first gives a stable base.

---

## Shared test helper

All tasks use this helper. Add it once at the **top of the new describe blocks** in `tests/DateField.unit.test.js` (before Task 1's describe).

```js
// ─── Shared fixture helper ────────────────────────────────────────────────────
function makeField({ disabled = false, value = '', min = '', max = '', locale = 'sv-SE', id } = {}) {
  const inputId = id ?? `df-test-${Math.random().toString(36).slice(2)}`
  const el = document.createElement('div')
  el.dataset.component = 'DateField'
  el.dataset.locale = locale
  if (min) { el.dataset.min = min }
  if (max) { el.dataset.max = max }
  el.innerHTML = `
    <input class="Native" id="${inputId}" type="date"
      ${value    ? `value="${value}"`  : ''}
      ${min      ? `min="${min}"`      : ''}
      ${max      ? `max="${max}"`      : ''}
      ${disabled ? 'disabled'          : ''}
    />
    <label for="${inputId}">Test label</label>
    <div class="Custom" aria-hidden="true">
      <div class="Segments" role="group">
        <span class="Segment" role="spinbutton" aria-label="Dag"
          aria-valuemin="1" aria-valuemax="31" aria-valuetext="dd"
          tabindex="0" data-segment="day" data-placeholder>dd</span>
        <span class="Separator" aria-hidden="true">/</span>
        <span class="Segment" role="spinbutton" aria-label="Månad"
          aria-valuemin="1" aria-valuemax="12" aria-valuetext="mm"
          tabindex="-1" data-segment="month" data-placeholder>mm</span>
        <span class="Separator" aria-hidden="true">/</span>
        <span class="Segment" role="spinbutton" aria-label="År"
          aria-valuemin="1900" aria-valuemax="2100" aria-valuetext="yyyy"
          tabindex="-1" data-segment="year" data-placeholder>yyyy</span>
        <button class="Trigger" type="button" aria-label="Öppna kalender"
          aria-expanded="false" aria-haspopup="dialog"></button>
      </div>
      <template data-template="datefield-calendar">
        <div class="DateFieldCalendar" role="dialog" aria-modal="true">
          <div class="CalendarHeader">
            <button type="button">&#8249;</button>
            <span aria-live="polite" aria-atomic="true"></span>
            <button type="button">&#8250;</button>
          </div>
          <table class="Grid" role="grid">
            <thead><tr role="row">
              <th scope="col"></th><th scope="col"></th><th scope="col"></th>
              <th scope="col"></th><th scope="col"></th><th scope="col"></th>
              <th scope="col"></th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </template>
    </div>
    <div class="Announce" aria-live="polite" aria-atomic="true"></div>
  `
  document.body.appendChild(el)
  const instance = new DateField(el)
  return { el, instance }
}
```

---

## Task 1 — Bug: Disabled state — segments still interactive

**Root cause:** `_handleSegmentKey` has no disabled guard. `_bindTrigger` adds a click listener unconditionally. Segments keep `tabindex="0"` even when native input is disabled.

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`
- Modify: `tests/DateField.unit.test.js`

---

- [ ] **Step 1: Write the failing tests**

Append to `tests/DateField.unit.test.js`:

```js
describe('DateField — disabled state', () => {
  it('sets all segments to tabindex="-1" when native is disabled', () => {
    const { el } = makeField({ disabled: true })
    el.querySelectorAll('.Segment').forEach(seg => {
      expect(seg.getAttribute('tabindex')).toBe('-1')
    })
    el.remove()
  })

  it('does not increment a segment when native is disabled', () => {
    const { el } = makeField({ disabled: true })
    const daySeg = el.querySelector('[data-segment="day"]')
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(daySeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })

  it('disables the calendar trigger button when native is disabled', () => {
    const { el, instance } = makeField({ disabled: true })
    expect(instance.trigger.disabled).toBe(true)
    el.remove()
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```
npm run test:unit
```
Expected: 3 failing tests in "DateField — disabled state".

- [ ] **Step 3: Implement the fix**

In `DateField.js`, make three small changes:

**3a — `_initSegments()`: make segments non-focusable when disabled**

After the `forEach` that adds listeners (after line `seg.addEventListener('blur', blurHandler)`), add:

```js
    // After the forEach loop:
    if (this.native.disabled) {
      this._segmentEls.forEach(seg => seg.setAttribute('tabindex', '-1'))
    }
```

**3b — `_handleSegmentKey()`: guard at the top**

```js
  _handleSegmentKey(e, seg) {
    if (this.native.disabled) return   // ← ADD THIS LINE
    switch (e.key) {
```

**3c — `_bindTrigger()`: disable trigger button when native is disabled**

```js
  _bindTrigger() {
    this.trigger.setAttribute('aria-label', this.t.openCalendar)
    if (this.native.disabled) {
      this.trigger.disabled = true
      return
    }
    this.trigger.addEventListener('click', this._handleTriggerClick)
  }
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npm run test:unit
```
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "fix(DateField): disabled segments are non-interactive when native is disabled"
```

---

## Task 2 — Bug: Initial value not synced to segments on mount

**Root cause:** `_init()` never reads `this.native.value`. The `_handleNativeChange` listener only fires on `change` events, so values set in HTML are invisible to the segments until the user interacts.

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`
- Modify: `tests/DateField.unit.test.js`

---

- [ ] **Step 1: Write the failing tests**

Append to `tests/DateField.unit.test.js`:

```js
describe('DateField — initial value sync', () => {
  it('populates segments from native value attribute on mount', () => {
    const { el } = makeField({ value: '1990-06-15' })
    expect(el.querySelector('[data-segment="day"]').getAttribute('aria-valuenow')).toBe('15')
    expect(el.querySelector('[data-segment="month"]').getAttribute('aria-valuenow')).toBe('6')
    expect(el.querySelector('[data-segment="year"]').getAttribute('aria-valuenow')).toBe('1990')
    el.remove()
  })

  it('sets selectedDate from native value on mount', () => {
    const { el, instance } = makeField({ value: '1990-06-15' })
    expect(instance.selectedDate).not.toBeNull()
    expect(instance.selectedDate.getFullYear()).toBe(1990)
    expect(instance.selectedDate.getMonth()).toBe(5) // 0-indexed
    expect(instance.selectedDate.getDate()).toBe(15)
    el.remove()
  })

  it('leaves segments as placeholders when no initial value', () => {
    const { el } = makeField()
    expect(el.querySelector('[data-segment="day"]').hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })

  it('populates segments from initial value even when field is disabled', () => {
    const { el } = makeField({ disabled: true, value: '1990-06-15' })
    expect(el.querySelector('[data-segment="day"]').getAttribute('aria-valuenow')).toBe('15')
    expect(el.querySelector('[data-segment="year"]').getAttribute('aria-valuenow')).toBe('1990')
    el.remove()
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```
npm run test:unit
```
Expected: 3 failing (the 4th — "no initial value" — may already pass).

- [ ] **Step 3: Implement the fix**

Add a new private method `_syncInitialValue()` to `DateField.js`, and call it from `_init()`.

**3a — Add `_syncInitialValue()` method** (place it in the "Value sync" section, after `_bindFormReset`):

```js
  _syncInitialValue() {
    if (!this.native.value) return
    const [y, m, d] = this.native.value.split('-').map(Number)
    this.selectedDate = new Date(y, m - 1, d)
    this._setSegmentValue(this._getSegmentEl('day'), d)
    this._setSegmentValue(this._getSegmentEl('month'), m)
    this._setSegmentValue(this._getSegmentEl('year'), y)
  }
```

**3b — Call it at the end of `_init()`**

```js
  _init() {
    const coarse = (typeof window.matchMedia === 'function')
      ? window.matchMedia('(pointer: coarse)').matches
      : false
    if (coarse) {
      this.root.dataset.inputMode = 'native'
      return
    }

    this.root.dataset.inputMode = 'custom'
    this.custom.removeAttribute('aria-hidden')

    const labelEl = this.native?.id
      ? document.querySelector(`label[for="${this.native.id}"]`)
      : null
    if (labelEl) {
      if (!labelEl.id) labelEl.id = `datefield-label-${this.instanceId}`
      this.segments.setAttribute('aria-labelledby', labelEl.id)
    } else if (this.root.dataset.labelField) {
      this.segments.setAttribute('aria-label', this.root.dataset.labelField)
    }

    this._initSegments()
    this._bindTrigger()
    if (!this.native.disabled) {
      this._bindValueSync()
      this._bindFormReset()
    }
    this._syncInitialValue()   // ← ADD
  }
```

Note: `_bindValueSync` and `_bindFormReset` are now guarded by `!this.native.disabled` — disabled inputs don't need autofill or reset listeners.

- [ ] **Step 4: Run tests to confirm they pass**

```
npm run test:unit
```
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "fix(DateField): sync initial value from native input to segments on mount"
```

---

## Task 3 — Bug: Year segment doesn't auto-advance focus after digit input

**Root cause:** `_handleDigit` for `year` calls `_setSegmentValue` and clears the buffer after 4 digits, but never calls `_moveSegmentFocus(seg, 1)`. Day and month both auto-advance. This will matter more after Task 7 (when year may not be the last segment).

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`
- Modify: `tests/DateField.unit.test.js`

---

- [ ] **Step 1: Write the failing test**

Append to `tests/DateField.unit.test.js`:

```js
describe('DateField — year digit input', () => {
  it('commits year value after 4 digits are typed', () => {
    const { el } = makeField()
    const yearSeg = el.querySelector('[data-segment="year"]')
    for (const digit of ['2', '0', '2', '6']) {
      yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: digit, bubbles: true }))
    }
    expect(yearSeg.getAttribute('aria-valuenow')).toBe('2026')
    expect(yearSeg.hasAttribute('data-placeholder')).toBe(false)
    el.remove()
  })

  it('does not commit year after fewer than 4 digits', () => {
    const { el } = makeField()
    const yearSeg = el.querySelector('[data-segment="year"]')
    for (const digit of ['2', '0', '2']) {
      yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: digit, bubbles: true }))
    }
    expect(yearSeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })
})
```

- [ ] **Step 2: Run to confirm — first test should already pass, confirming year commitment works; this is a regression guard**

```
npm run test:unit
```
Expected: both green (they confirm existing behavior before we add the `_moveSegmentFocus` call).

- [ ] **Step 3: Implement the fix**

In `_handleDigit`, find the `year` branch and add `_moveSegmentFocus`:

```js
    } else if (type === 'year') {
      if (this._digitBuffer.length === 4) {
        const limits = this._getSegmentLimits('year')
        const clamped = Math.max(limits.min, Math.min(limits.max, num))
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)   // ← ADD (no-op today since year is last; needed for Task 7)
      }
    }
```

Note: this also prepares for Task 4 by using `limits` from `_getSegmentLimits` instead of hardcoded 1900/2100. Keep both changes here together since they're in the same line range.

- [ ] **Step 4: Run tests to confirm they still pass**

```
npm run test:unit
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "fix(DateField): year segment auto-advances focus and uses dynamic limits after digit input"
```

---

## Task 4 — Bug: Year segment limits ignore data-min / data-max

**Root cause:** `_getSegmentLimits('year')` hardcodes `{ min: 1900, max: 2100 }` regardless of `this.min` / `this.max`. For a booking field with `data-min="2026-03-26"`, pressing ArrowUp on an empty year goes to 1900 instead of 2026.

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`
- Modify: `tests/DateField.unit.test.js`

---

- [ ] **Step 1: Write the failing tests**

Append to `tests/DateField.unit.test.js`:

```js
describe('DateField — year limits from data-min/max', () => {
  it('_getSegmentLimits("year") uses data-min year', () => {
    const { el, instance } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    expect(instance._getSegmentLimits('year').min).toBe(2026)
    el.remove()
  })

  it('_getSegmentLimits("year") uses data-max year', () => {
    const { el, instance } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    expect(instance._getSegmentLimits('year').max).toBe(2027)
    el.remove()
  })

  it('ArrowUp on empty year starts at data-min year', () => {
    const { el } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    const yearSeg = el.querySelector('[data-segment="year"]')
    yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(yearSeg.getAttribute('aria-valuenow')).toBe('2026')
    el.remove()
  })

  it('ArrowUp on empty year defaults to 1900 when no data-min set', () => {
    const { el } = makeField()
    const yearSeg = el.querySelector('[data-segment="year"]')
    yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(yearSeg.getAttribute('aria-valuenow')).toBe('1900')
    el.remove()
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```
npm run test:unit
```
Expected: "starts at data-min year" test fails (gets 1900). "uses data-min year" test fails.

- [ ] **Step 3: Implement the fix**

In `_getSegmentLimits`, replace the hardcoded year return:

```js
  _getSegmentLimits(type) {
    if (type === 'day') {
      const year = this._getSegmentValueByType('year') ?? new Date().getFullYear()
      const month = this._getSegmentValueByType('month')
      const daysInMonth = month != null ? getDaysInMonth(year, month - 1) : 31
      return { min: 1, max: daysInMonth }
    }
    if (type === 'month') return { min: 1, max: 12 }
    // year — respect data-min / data-max when set
    return {
      min: this.min ? this.min.getFullYear() : 1900,
      max: this.max ? this.max.getFullYear() : 2100,
    }
  }
```

The `_handleDigit` year branch already uses `_getSegmentLimits` after the Task 3 fix, so clamping is automatically correct here too.

- [ ] **Step 4: Run tests to confirm they pass**

```
npm run test:unit
```
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "fix(DateField): year segment limits respect data-min and data-max attributes"
```

---

## Task 5 — Bug: Segment input can commit out-of-range dates

**Root cause:** `_trySyncToNative()` writes any complete date to `native.value` without checking `this.min` / `this.max`. A user could keyboard-enter `2025-01-01` into a field with `data-min="2026-03-26"`.

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`
- Modify: `tests/DateField.unit.test.js`

---

- [ ] **Step 1: Write the failing tests**

Append to `tests/DateField.unit.test.js`:

```js
describe('DateField — min/max enforcement on segment sync', () => {
  it('does not write to native input when complete date is before data-min', () => {
    const { el, instance } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    const native = el.querySelector('.Native')
    // Manually build an out-of-range date (2025-01-01) via segments
    instance._setSegmentValue(instance._getSegmentEl('day'), 1)
    instance._setSegmentValue(instance._getSegmentEl('month'), 1)
    instance._setSegmentValue(instance._getSegmentEl('year'), 2025)
    expect(native.value).toBe('')
    el.remove()
  })

  it('does not write to native input when complete date is after data-max', () => {
    const { el, instance } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    const native = el.querySelector('.Native')
    instance._setSegmentValue(instance._getSegmentEl('day'), 1)
    instance._setSegmentValue(instance._getSegmentEl('month'), 1)
    instance._setSegmentValue(instance._getSegmentEl('year'), 2028)
    expect(native.value).toBe('')
    el.remove()
  })

  it('writes to native input when complete date is within data-min/max', () => {
    const { el, instance } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    const native = el.querySelector('.Native')
    instance._setSegmentValue(instance._getSegmentEl('day'), 1)
    instance._setSegmentValue(instance._getSegmentEl('month'), 4)
    instance._setSegmentValue(instance._getSegmentEl('year'), 2026)
    expect(native.value).toBe('2026-04-01')
    el.remove()
  })

  it('always writes when no data-min/max set', () => {
    const { el, instance } = makeField()
    const native = el.querySelector('.Native')
    instance._setSegmentValue(instance._getSegmentEl('day'), 1)
    instance._setSegmentValue(instance._getSegmentEl('month'), 1)
    instance._setSegmentValue(instance._getSegmentEl('year'), 1900)
    expect(native.value).toBe('1900-01-01')
    el.remove()
  })
})
```

- [ ] **Step 2: Run to confirm the first two fail**

```
npm run test:unit
```
Expected: "before data-min" and "after data-max" tests fail (native.value gets set instead of staying '').

- [ ] **Step 3: Implement the fix**

In `_trySyncToNative()`, add range guards after the `isNaN` check:

```js
  _trySyncToNative() {
    const d = this._getSegmentValueByType('day')
    const m = this._getSegmentValueByType('month')
    const y = this._getSegmentValueByType('year')
    if (d == null || m == null || y == null) return

    const date = new Date(y, m - 1, d)
    if (isNaN(date.getTime())) return

    if (this.min) {
      const minDay = new Date(this.min.getFullYear(), this.min.getMonth(), this.min.getDate())
      if (date < minDay) return
    }
    if (this.max) {
      const maxDay = new Date(this.max.getFullYear(), this.max.getMonth(), this.max.getDate())
      if (date > maxDay) return
    }

    this.selectedDate = date
    this._syncingFromCustom = true
    this.native.value = formatISO(date)
    this.native.dispatchEvent(new Event('change', { bubbles: true }))
    this._syncingFromCustom = false

    const label = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
    this.announce.textContent = `${this.t.announceSelected} ${label}`
  }
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npm run test:unit
```
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "fix(DateField): segment input does not commit dates outside data-min/max range"
```

---

## What's next — Plan B

After this plan is complete, write a separate plan for:

**Task 7 — Feature: Locale-derived segment order + JS-generated segments (`Intl.DateTimeFormat.formatToParts`)**

This also resolves Task 6 (hardcoded Swedish aria-labels on coarse devices) for free, since segments will be generated in JS with `this.t[type]` labels at creation time.
