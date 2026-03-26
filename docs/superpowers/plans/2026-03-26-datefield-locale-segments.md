# DateField — Locale-Derived Segment Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded `dd/mm/yyyy` segment order with locale-derived order and separator from `Intl.DateTimeFormat.formatToParts`, and generate segments programmatically in JS — which also fixes hardcoded Swedish aria-labels on coarse/touch devices (task #6) for free.

**Architecture:** A new exported `getSegmentOrder(locale)` helper extracts field order (`['year','month','day']`) and separator (`'-'`) from the locale. `_initSegments()` is rewritten to clear any pre-existing HTML segments, call `getSegmentOrder`, and generate `<span>` elements via a new `_createSegmentEl(type)` method — inserting them in locale order with locale separators. HTML templates are updated last to remove the now-redundant hardcoded spans.

**Tech Stack:** Vanilla JS, `Intl.DateTimeFormat.formatToParts`, Vitest + jsdom, `npm run test:unit`

---

## File map

| File | Change |
|---|---|
| `src/partials/components/DateField/DateField.js` | Add `getSegmentOrder`, rewrite `_initSegments`, add `_createSegmentEl` |
| `tests/DateField.unit.test.js` | Add tests for `getSegmentOrder` and locale-derived segment rendering; update `makeField` helper |
| `src/partials/components/DateField/DateField.html` | Remove hardcoded segment spans — keep only trigger |
| `src/partials/sections/input/custom-date.html` | Same removal in all 6 instances |

---

## Task 1 — Export `getSegmentOrder` utility

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`
- Modify: `tests/DateField.unit.test.js`

---

- [ ] **Step 1: Add failing tests**

Import `getSegmentOrder` at the top of `tests/DateField.unit.test.js` — add it to the existing import line:

```js
import {
  getDaysInMonth,
  getFirstWeekdayOfMonth,
  getISOWeek,
  isDayDisabled,
  formatISO,
  getWeekdayNames,
  getMonthName,
  getSegmentOrder,   // ← ADD
} from '../src/partials/components/DateField/DateField.js'
```

Then append this describe block to the file:

```js
describe('getSegmentOrder', () => {
  it('returns ["year","month","day"] order for sv-SE', () => {
    const { order } = getSegmentOrder('sv-SE')
    expect(order).toEqual(['year', 'month', 'day'])
  })

  it('returns "-" as separator for sv-SE', () => {
    const { separator } = getSegmentOrder('sv-SE')
    expect(separator).toBe('-')
  })

  it('always returns exactly 3 segment types', () => {
    expect(getSegmentOrder('en').order).toHaveLength(3)
    expect(getSegmentOrder('sv-SE').order).toHaveLength(3)
  })

  it('returns only valid segment type strings', () => {
    const { order } = getSegmentOrder('sv-SE')
    const valid = new Set(['day', 'month', 'year'])
    order.forEach(type => expect(valid.has(type)).toBe(true))
  })

  it('returns a non-empty string separator', () => {
    const { separator } = getSegmentOrder('en')
    expect(typeof separator).toBe('string')
    expect(separator.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Verify tests fail**

```
npm run test:unit
```
Expected: 5 failing tests ("getSegmentOrder is not exported").

- [ ] **Step 3: Add `getSegmentOrder` to DateField.js**

Add this function to the "Date helpers" section at the top of `src/partials/components/DateField/DateField.js`, after `getMonthName`:

```js
export function getSegmentOrder(locale) {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(2026, 0, 15))

    const order = []
    let separator = '/'

    for (const part of parts) {
      if (part.type === 'day' || part.type === 'month' || part.type === 'year') {
        order.push(part.type)
      } else if (part.type === 'literal' && order.length > 0 && order.length < 3) {
        const trimmed = part.value.trim()
        if (trimmed) separator = trimmed
      }
    }

    if (order.length === 3) return { order, separator }
  } catch (_) {}

  return { order: ['day', 'month', 'year'], separator: '/' }
}
```

- [ ] **Step 4: Verify tests pass**

```
npm run test:unit
```
Expected: all tests green (45 existing + 5 new = 50 total).

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "feat(DateField): export getSegmentOrder to derive locale field order and separator"
```

---

## Task 2 — Rewrite `_initSegments` to generate segments in JS

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`
- Modify: `tests/DateField.unit.test.js`

---

- [ ] **Step 1: Add failing tests**

Append to `tests/DateField.unit.test.js`:

```js
describe('DateField — locale-derived segment order', () => {
  const svSEStrings = {
    day: 'Dag', month: 'Månad', year: 'År',
    openCalendar: 'Öppna kalender', closeCalendar: 'Stäng kalender',
    prevMonth: 'Föregående månad', nextMonth: 'Nästa månad',
    today: 'idag', selected: 'valt', notAvailable: 'ej tillgängligt',
    announceSelected: 'Valt datum:',
  }

  it('sv-SE renders segments in year-month-day DOM order', () => {
    DateField.registerLocale('sv-SE', svSEStrings)
    const { el } = makeField({ locale: 'sv-SE' })
    const segs = [...el.querySelectorAll('[data-segment]')]
    expect(segs[0].dataset.segment).toBe('year')
    expect(segs[1].dataset.segment).toBe('month')
    expect(segs[2].dataset.segment).toBe('day')
    el.remove()
  })

  it('sv-SE separators use "-"', () => {
    DateField.registerLocale('sv-SE', svSEStrings)
    const { el } = makeField({ locale: 'sv-SE' })
    const separators = [...el.querySelectorAll('.Separator')]
    expect(separators).toHaveLength(2)
    separators.forEach(sep => expect(sep.textContent).toBe('-'))
    el.remove()
  })

  it('sv-SE segments have locale aria-labels (Dag, Månad, År)', () => {
    DateField.registerLocale('sv-SE', svSEStrings)
    const { el } = makeField({ locale: 'sv-SE' })
    expect(el.querySelector('[data-segment="day"]').getAttribute('aria-label')).toBe('Dag')
    expect(el.querySelector('[data-segment="month"]').getAttribute('aria-label')).toBe('Månad')
    expect(el.querySelector('[data-segment="year"]').getAttribute('aria-label')).toBe('År')
    el.remove()
  })

  it('en segments have English aria-labels (Day, Month, Year)', () => {
    const { el } = makeField({ locale: 'en' })
    expect(el.querySelector('[data-segment="day"]').getAttribute('aria-label')).toBe('Day')
    expect(el.querySelector('[data-segment="month"]').getAttribute('aria-label')).toBe('Month')
    expect(el.querySelector('[data-segment="year"]').getAttribute('aria-label')).toBe('Year')
    el.remove()
  })

  it('generates exactly 3 segments and 2 separators', () => {
    const { el } = makeField({ locale: 'en' })
    expect(el.querySelectorAll('[data-segment]')).toHaveLength(3)
    expect(el.querySelectorAll('.Separator')).toHaveLength(2)
    el.remove()
  })

  it('first generated segment has tabindex="0", others have "-1"', () => {
    const { el } = makeField({ locale: 'en' })
    const segs = [...el.querySelectorAll('[data-segment]')]
    expect(segs[0].getAttribute('tabindex')).toBe('0')
    segs.slice(1).forEach(seg => expect(seg.getAttribute('tabindex')).toBe('-1'))
    el.remove()
  })
})
```

- [ ] **Step 2: Verify tests fail**

```
npm run test:unit
```
Expected: most of the 6 new tests fail (segments are still read from HTML, not locale-ordered).

- [ ] **Step 3: Add `_createSegmentEl` private method to `DateField.js`**

Add this method inside the `DateField` class, in the `// ─── Segments` section, immediately before `_initSegments()`:

```js
  _createSegmentEl(type) {
    const span = document.createElement('span')
    span.className = 'Segment'
    span.setAttribute('role', 'spinbutton')
    span.setAttribute('aria-label', this.t[type] || type)
    span.setAttribute('data-segment', type)
    span.setAttribute('data-placeholder', '')
    span.setAttribute('tabindex', '-1') // first segment will be set to 0 after all are inserted

    const limits = this._getSegmentLimits(type)
    span.setAttribute('aria-valuemin', limits.min)
    span.setAttribute('aria-valuemax', limits.max)

    const placeholder = type === 'day' ? 'dd' : type === 'month' ? 'mm' : 'yyyy'
    span.setAttribute('aria-valuetext', placeholder)
    span.textContent = placeholder

    return span
  }
```

- [ ] **Step 4: Rewrite `_initSegments()` in `DateField.js`**

Replace the current `_initSegments()` method body entirely:

```js
  _initSegments() {
    // Remove any pre-existing segment spans and separators (handles legacy HTML templates)
    this.segments.querySelectorAll('.Segment, .Separator').forEach(el => el.remove())

    // Determine segment order and separator from locale
    const { order, separator } = getSegmentOrder(this.locale)

    // Generate and insert segments + separators before the trigger button
    order.forEach((type, i) => {
      this.trigger.before(this._createSegmentEl(type))
      if (i < order.length - 1) {
        const sep = document.createElement('span')
        sep.className = 'Separator'
        sep.setAttribute('aria-hidden', 'true')
        sep.textContent = separator
        this.trigger.before(sep)
      }
    })

    // Collect generated segment elements and set up roving tabindex
    this._segmentEls = [...this.segments.querySelectorAll('[data-segment]')]
    if (this._segmentEls.length > 0) {
      this._segmentEls[0].setAttribute('tabindex', '0')
    }

    // Bind event listeners
    this._segmentEls.forEach(seg => {
      const keydownHandler = e => this._handleSegmentKey(e, seg)
      const focusHandler = () => this._setSegmentFocused(seg)
      const blurHandler = () => seg.removeAttribute('data-focused')
      seg.__dateFieldHandlers = { keydown: keydownHandler, focus: focusHandler, blur: blurHandler }
      seg.addEventListener('keydown', keydownHandler)
      seg.addEventListener('focus', focusHandler)
      seg.addEventListener('blur', blurHandler)
    })

    // Disabled: make all segments non-focusable
    if (this.native.disabled) {
      this._segmentEls.forEach(seg => seg.setAttribute('tabindex', '-1'))
    }
  }
```

- [ ] **Step 5: Verify all tests pass**

```
npm run test:unit
```
Expected: all tests green (50 existing + 6 new = 56 total).

- [ ] **Step 6: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "feat(DateField): generate segments in JS with locale-derived order and separator"
```

---

## Task 3 — Remove hardcoded segment spans from HTML templates and test helper

Now that `_initSegments` generates segments itself (and clears any pre-existing ones), the spans in the HTML are dead weight. Remove them.

**Files:**
- Modify: `src/partials/components/DateField/DateField.html`
- Modify: `src/partials/sections/input/custom-date.html`
- Modify: `tests/DateField.unit.test.js` (update `makeField` helper)

No new tests needed — this is purely a cleanup. The full suite should still pass after the changes.

---

- [ ] **Step 1: Update `src/partials/components/DateField/DateField.html`**

Remove the three `<span class="Segment">` elements and two `<span class="Separator">` elements. Keep the trigger button. The `.Segments` div should look like this:

```html
<div class="Segments" role="group">

  <button
    type="button"
    class="Trigger"
    aria-label="Öppna kalender"
    aria-expanded="false"
    aria-haspopup="dialog"
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  </button>

</div>
```

- [ ] **Step 2: Update `src/partials/sections/input/custom-date.html`**

The file has 6 DateField instances. In each one, find the `.Segments` div and remove the three `<span class="Segment">` and two `<span class="Separator">` elements — keeping only the `<button class="Trigger">`.

Each instance's `.Segments` div should look like this after cleanup:

```html
<div class="Segments" role="group">
  <button type="button" class="Trigger" aria-label="Öppna kalender"
    aria-expanded="false" aria-haspopup="dialog">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  </button>
</div>
```

Apply this to all 6 instances (Default, Required, Disabled, Future only, English locale, Pre-filled).

- [ ] **Step 3: Update `makeField` helper in `tests/DateField.unit.test.js`**

Find the `makeField` function and replace the innerHTML template. The `.Segments` div should only contain the trigger — JS will generate the segments. The rest of the template stays the same:

```js
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

- [ ] **Step 4: Verify all tests still pass**

```
npm run test:unit
```
Expected: 56 tests green, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.html \
        src/partials/sections/input/custom-date.html \
        tests/DateField.unit.test.js
git commit -m "chore(DateField): remove hardcoded segment spans from HTML — now generated by JS"
```
