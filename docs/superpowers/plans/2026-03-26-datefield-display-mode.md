# DateField Display Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `pointer: coarse` (mobile), render the DateField's custom UI visually but make it display-only — taps fall through to an absolutely-positioned `opacity: 0` native input that opens the OS date picker.

**Architecture:** A new `data-input-mode="display"` replaces `"native"`. `_init()` splits into `_initDisplay()` (segments rendered, no keyboard handlers, native input overlaid) and `_initInteractive()` (current desktop behaviour, unchanged). `_initSegments()` splits into `_buildSegments()` (DOM) + `_bindSegmentEvents()` (handlers), so display mode can reuse the segment DOM without the interactive wiring.

**Tech Stack:** Vanilla JS (ES2020 class), CSS nesting, Vitest + jsdom

---

## File map

| File | Change |
|------|--------|
| `src/partials/components/DateField/DateField.css` | Add `[data-input-mode="display"]` block |
| `src/partials/components/DateField/DateField.js` | Split `_initSegments()` → `_buildSegments()` + `_bindSegmentEvents()`; add `_initDisplay()`; refactor `_init()` |
| `tests/DateField.unit.test.js` | Add display-mode describe block; add `vi` to imports |

---

## Task 1: CSS — add `[data-input-mode="display"]` block

**Files:**
- Modify: `src/partials/components/DateField/DateField.css`

> CSS is not unit-testable in jsdom. Visual correctness is verified by running the dev server on a phone or in Chrome DevTools with pointer set to coarse. No failing test step.

- [ ] **Step 1: Add the display-mode CSS block**

In `DateField.css`, add this block immediately after the closing `}` of the `&[data-input-mode="custom"]` block (after line 36):

```css
  &[data-input-mode="display"] {
    & .Native {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    & .Custom {
      display: block;
      pointer-events: none;
    }
  }
```

- [ ] **Step 2: Run existing unit tests — expect all to pass (no regressions)**

```bash
npx vitest run tests/DateField.unit.test.js
```

Expected: all existing tests pass. The new CSS block has no effect on jsdom tests.

- [ ] **Step 3: Commit**

```bash
git add src/partials/components/DateField/DateField.css
git commit -m "feat(DateField): add display mode CSS — custom UI visible, native input overlaid opacity:0"
```

---

## Task 2: Write failing tests for display mode

**Files:**
- Modify: `tests/DateField.unit.test.js`

- [ ] **Step 1: Add `vi` to the vitest import**

Change line 1 from:
```js
import { describe, it, expect } from 'vitest'
```
to:
```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
```

- [ ] **Step 2: Add `makeDisplayField` helper and display mode describe block**

Append to the end of `tests/DateField.unit.test.js`:

```js
// ─── Display mode helpers ──────────────────────────────────────────────────

function makeDisplayField({ value = '', min = '', max = '', locale = 'sv-SE', disabled = false } = {}) {
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query === '(pointer: coarse)',
    media: query,
    addListener: () => {},
    removeListener: () => {},
  }))
  const result = makeField({ value, min, max, locale, disabled })
  vi.unstubAllGlobals()
  return result
}

describe('DateField — display mode (pointer: coarse)', () => {
  it('sets data-input-mode to "display"', () => {
    const { el } = makeDisplayField()
    expect(el.dataset.inputMode).toBe('display')
    el.remove()
  })

  it('keeps aria-hidden="true" on .Custom — it is a decorative display layer', () => {
    const { el } = makeDisplayField()
    expect(el.querySelector('.Custom').getAttribute('aria-hidden')).toBe('true')
    el.remove()
  })

  it('generates segment elements in the DOM', () => {
    const { el } = makeDisplayField()
    expect(el.querySelectorAll('[data-segment]')).toHaveLength(3)
    el.remove()
  })

  it('all segments have tabindex="-1" — not focusable', () => {
    const { el } = makeDisplayField()
    el.querySelectorAll('[data-segment]').forEach(seg => {
      expect(seg.getAttribute('tabindex')).toBe('-1')
    })
    el.remove()
  })

  it('syncs initial native value to segments on mount', () => {
    const { el } = makeDisplayField({ value: '1990-06-15' })
    expect(el.querySelector('[data-segment="day"]').getAttribute('aria-valuenow')).toBe('15')
    expect(el.querySelector('[data-segment="month"]').getAttribute('aria-valuenow')).toBe('6')
    expect(el.querySelector('[data-segment="year"]').getAttribute('aria-valuenow')).toBe('1990')
    el.remove()
  })

  it('leaves segments as placeholders when no initial value', () => {
    const { el } = makeDisplayField()
    el.querySelectorAll('[data-segment]').forEach(seg => {
      expect(seg.hasAttribute('data-placeholder')).toBe(true)
    })
    el.remove()
  })

  it('updates segments when native value changes externally', () => {
    const { el } = makeDisplayField()
    const native = el.querySelector('.Native')
    native.value = '2026-12-31'
    native.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.querySelector('[data-segment="day"]').getAttribute('aria-valuenow')).toBe('31')
    expect(el.querySelector('[data-segment="month"]').getAttribute('aria-valuenow')).toBe('12')
    expect(el.querySelector('[data-segment="year"]').getAttribute('aria-valuenow')).toBe('2026')
    el.remove()
  })

  it('clears segments on form reset', () => {
    const form = document.createElement('form')
    document.body.appendChild(form)

    vi.stubGlobal('matchMedia', (query) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      addListener: () => {},
      removeListener: () => {},
    }))
    const inputId = `df-reset-test-${Math.random().toString(36).slice(2)}`
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.locale = 'sv-SE'
    el.innerHTML = `
      <input class="Native" id="${inputId}" type="date" value="2026-03-26" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group">
          <button class="Trigger" type="button"></button>
        </div>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    form.appendChild(el)
    new DateField(el)
    vi.unstubAllGlobals()

    form.reset()

    el.querySelectorAll('[data-segment]').forEach(seg => {
      expect(seg.hasAttribute('data-placeholder')).toBe(true)
    })
    form.remove()
  })

  it('keyboard events on segments do nothing — no handlers bound', () => {
    const { el } = makeDisplayField({ value: '2026-01-15' })
    const daySeg = el.querySelector('[data-segment="day"]')
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    // Value should remain 15 — ArrowUp must not increment
    expect(daySeg.getAttribute('aria-valuenow')).toBe('15')
    el.remove()
  })

  it('sets data-disabled on root when native input is disabled', () => {
    const { el } = makeDisplayField({ disabled: true })
    expect(el.hasAttribute('data-disabled')).toBe(true)
    el.remove()
  })
})
```

- [ ] **Step 3: Run tests — expect new display mode tests to FAIL**

```bash
npx vitest run tests/DateField.unit.test.js
```

Expected output: the new `DateField — display mode` suite has multiple failures. The rest of the suite still passes. If all tests pass, something is wrong — stop and investigate.

---

## Task 3: Implement display mode in JS

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`

- [ ] **Step 1: Split `_initSegments()` into `_buildSegments()` + `_bindSegmentEvents()`**

In `DateField.js`, replace the entire `_initSegments()` method (lines 252–292) with these two methods:

```js
_buildSegments() {
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

  // Disabled: make all segments non-focusable
  if (this.native.disabled) {
    this._segmentEls.forEach(seg => seg.setAttribute('tabindex', '-1'))
  }
}

_bindSegmentEvents() {
  this._segmentEls.forEach(seg => {
    const keydownHandler = e => this._handleSegmentKey(e, seg)
    const focusHandler = () => this._setSegmentFocused(seg)
    const blurHandler = () => seg.removeAttribute('data-focused')
    seg.__dateFieldHandlers = { keydown: keydownHandler, focus: focusHandler, blur: blurHandler }
    seg.addEventListener('keydown', keydownHandler)
    seg.addEventListener('focus', focusHandler)
    seg.addEventListener('blur', blurHandler)
  })
}
```

- [ ] **Step 2: Add `_initDisplay()` method**

Add this method immediately after `_bindSegmentEvents()`:

```js
_initDisplay() {
  this.root.dataset.inputMode = 'display'
  if (this.native.disabled) this.root.dataset.disabled = ''

  this._buildSegments()

  // Display segments are not interactive — override roving tabindex
  this._segmentEls.forEach(seg => seg.setAttribute('tabindex', '-1'))

  // Keep segments updated when native value changes (autofill, programmatic)
  this.native.addEventListener('change', this._handleNativeChange)
  this.native.form?.addEventListener('reset', this._handleFormReset)

  // Sync initial native value to segment display
  if (this.native.value) this._syncInitialValue()
}
```

- [ ] **Step 3: Add `_initInteractive()` method and refactor `_init()`**

Replace the entire `_init()` method (lines 163–194) with these two methods:

```js
_init() {
  const coarse = (typeof window.matchMedia === 'function')
    ? window.matchMedia('(pointer: coarse)').matches
    : false
  if (coarse) {
    this._initDisplay()
    return
  }
  this._initInteractive()
}

_initInteractive() {
  this.root.dataset.inputMode = 'custom'
  this.custom.removeAttribute('aria-hidden')

  // Connect field label via aria-labelledby → <label for="..."> or aria-label fallback
  const labelEl = this.native?.id
    ? document.querySelector(`label[for="${this.native.id}"]`)
    : null
  if (labelEl) {
    if (!labelEl.id) labelEl.id = `datefield-label-${this.instanceId}`
    this.segments.setAttribute('aria-labelledby', labelEl.id)
  } else if (this.root.dataset.labelField) {
    this.segments.setAttribute('aria-label', this.root.dataset.labelField)
  }

  if (this.native.disabled) this.root.dataset.disabled = ''
  this._buildSegments()
  this._bindSegmentEvents()
  this._bindTrigger()
  if (!this.native.disabled) {
    this._bindValueSync()
    this._bindFormReset()
  }
  this._syncInitialValue()
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npx vitest run tests/DateField.unit.test.js
```

Expected: full suite passes, including all new display mode tests. If any test fails, read the error carefully — do not retry, diagnose instead.

- [ ] **Step 5: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "feat(DateField): split init into _initDisplay / _initInteractive — display mode for pointer:coarse"
```

---

## Self-review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `"display"` replaces `"native"` as mode name | Task 3 step 3 |
| CSS: `.Native` absolute, `opacity:0`, covers `.Custom` | Task 1 step 1 |
| CSS: `.Custom` display:block, `pointer-events:none` | Task 1 step 1 |
| `aria-hidden="true"` stays on `.Custom` in display mode | Task 3 step 2, tested in Task 2 |
| Segments rendered in display mode | Task 3 step 1+2, tested in Task 2 |
| All segments `tabindex="-1"` in display mode | Task 3 step 2, tested in Task 2 |
| Initial native value → segment display | Task 3 step 2, tested in Task 2 |
| Native `change` → segment display update | Task 3 step 2, tested in Task 2 |
| Form reset → clear segments | Task 3 step 2, tested in Task 2 |
| No keyboard handlers in display mode | Task 3 step 1 (no `_bindSegmentEvents()`), tested in Task 2 |
| `destroy()` works in both modes | No change needed — existing guards handle it |
| `data-disabled` on root in display mode | Task 3 step 2, tested in Task 2 |

No gaps found.

**Placeholder scan:** None.

**Type/name consistency:** `_buildSegments`, `_bindSegmentEvents`, `_initDisplay`, `_initInteractive` — used consistently across all tasks.
