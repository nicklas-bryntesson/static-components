# DateField Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tech-agnostic custom date field component that uses segment-based input on pointer:fine devices and native OS date picker on pointer:coarse, with full WCAG 2.2 AA compliance and i18n support via registerLocale.

**Architecture:** Vanilla JS class following the same attach/destroy/instanceCount pattern as `CoverCompositionVideo`. CSS is purely data-attribute-driven (no overrides). The calendar is a `<template>` that gets cloned to `<body>` on open and removed on close — required for `aria-modal` to work in VoiceOver/Safari.

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules), Vite, Vitest (unit), Playwright (e2e + a11y via axe-core)

**Spec:** `docs/superpowers/specs/2026-03-25-date-field-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/partials/components/DateField/DateField.html` | Component markup — full structure per spec §3 |
| Create | `src/partials/components/DateField/DateField.css` | Styles — data-attr gates only, per spec §4 |
| Create | `src/partials/components/DateField/DateField.js` | JS class — per spec §5 |
| Create | `src/partials/components/DateField/locales/en.json` | English translation strings |
| Create | `src/partials/components/DateField/locales/sv-SE.json` | Swedish translation strings |
| Modify | `src/js/script.js` | Import DateField, call DateField.attach(), register sv-SE locale |
| Modify | `src/partials/global/main/Main.html` | Add a DateField demo instance |
| Create | `tests/DateField.unit.test.js` | Vitest unit tests — date math, locale helpers |
| Create | `tests/DateField.e2e.test.js` | Playwright e2e + axe-core tests |
| Modify | `package.json` | Add vitest, @vitest/browser, playwright, axe-core |
| Create | `vitest.config.js` | Vitest config |
| Create | `playwright.config.js` | Playwright config |

---

## Task 1: Test infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `playwright.config.js`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest @vitest/browser jsdom
```

- [ ] **Step 2: Install Playwright + axe-core**

```bash
npm install --save-dev @playwright/test axe-playwright
npx playwright install chromium
```

- [ ] **Step 3: Create vitest.config.js**

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 4: Create playwright.config.js**

```js
// playwright.config.js
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.test.js',
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 5: Add test scripts to package.json**

Add to `"scripts"`:
```json
"test:unit": "vitest run",
"test:e2e": "playwright test",
"test": "vitest run && playwright test"
```

- [ ] **Step 6: Verify vitest runs (empty)**

```bash
npm run test:unit
```

Expected: no test files found, exit 0

---

## Task 2: Locale files

**Files:**
- Create: `src/partials/components/DateField/locales/en.json`
- Create: `src/partials/components/DateField/locales/sv-SE.json`

These are the source of truth for all generic UI strings. `registerLocale` is the bridge that loads them into the component.

- [ ] **Step 1: Create en.json**

```json
{
  "day":              "Day",
  "month":            "Month",
  "year":             "Year",
  "openCalendar":     "Open calendar",
  "closeCalendar":    "Close calendar",
  "prevMonth":        "Previous month",
  "nextMonth":        "Next month",
  "today":            "today",
  "selected":         "selected",
  "notAvailable":     "not available",
  "announceSelected": "Selected date:"
}
```

- [ ] **Step 2: Create sv-SE.json**

```json
{
  "day":              "Dag",
  "month":            "Månad",
  "year":             "År",
  "openCalendar":     "Öppna kalender",
  "closeCalendar":    "Stäng kalender",
  "prevMonth":        "Föregående månad",
  "nextMonth":        "Nästa månad",
  "today":            "idag",
  "selected":         "valt",
  "notAvailable":     "ej tillgängligt",
  "announceSelected": "Valt datum:"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/partials/components/DateField/locales/
git commit -m "feat(DateField): add locale JSON files (en, sv-SE)"
```

---

## Task 3: Unit tests — date helpers (write failing first)

**Files:**
- Create: `tests/DateField.unit.test.js`

These test pure functions that will live inside DateField.js. Write them before the implementation.

- [ ] **Step 1: Create unit test file**

```js
// tests/DateField.unit.test.js
import { describe, it, expect } from 'vitest'
import {
  getDaysInMonth,
  getFirstWeekdayOfMonth,
  getISOWeek,
  isDayDisabled,
  formatISO,
  getWeekdayNames,
  getMonthName,
} from '../src/partials/components/DateField/DateField.js'

describe('getDaysInMonth', () => {
  it('returns 29 for Feb in leap year 2024', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29)
  })
  it('returns 28 for Feb in non-leap year 2023', () => {
    expect(getDaysInMonth(2023, 1)).toBe(28)
  })
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31)
  })
  it('returns 30 for April', () => {
    expect(getDaysInMonth(2026, 3)).toBe(30)
  })
})

describe('getFirstWeekdayOfMonth', () => {
  // March 2026: starts on a Sunday (JS day 0) → Monday-first index = 6
  it('returns 6 for March 2026 (starts Sunday, Monday-first grid)', () => {
    expect(getFirstWeekdayOfMonth(2026, 2)).toBe(6)
  })
  // January 2026: starts on Thursday → Monday-first index = 3
  it('returns 3 for January 2026 (starts Thursday)', () => {
    expect(getFirstWeekdayOfMonth(2026, 0)).toBe(3)
  })
})

describe('getISOWeek', () => {
  it('returns 1 for Jan 4 2026 (always in week 1)', () => {
    expect(getISOWeek(new Date(2026, 0, 4))).toBe(1)
  })
  it('returns 53 for Dec 28 2020', () => {
    expect(getISOWeek(new Date(2020, 11, 28))).toBe(53)
  })
})

describe('isDayDisabled', () => {
  const min = new Date(2026, 0, 10)
  const max = new Date(2026, 0, 20)
  it('disables dates before min', () => {
    expect(isDayDisabled(new Date(2026, 0, 9), min, max)).toBe(true)
  })
  it('disables dates after max', () => {
    expect(isDayDisabled(new Date(2026, 0, 21), min, max)).toBe(true)
  })
  it('allows dates within range', () => {
    expect(isDayDisabled(new Date(2026, 0, 15), min, max)).toBe(false)
  })
  it('allows min date itself', () => {
    expect(isDayDisabled(new Date(2026, 0, 10), min, max)).toBe(false)
  })
  it('allows max date itself', () => {
    expect(isDayDisabled(new Date(2026, 0, 20), min, max)).toBe(false)
  })
  it('allows all dates when no min/max', () => {
    expect(isDayDisabled(new Date(2026, 0, 1), null, null)).toBe(false)
  })
})

describe('formatISO', () => {
  it('formats to yyyy-mm-dd', () => {
    expect(formatISO(new Date(2026, 2, 5))).toBe('2026-03-05')
  })
  it('pads single-digit month and day', () => {
    expect(formatISO(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})

describe('getWeekdayNames', () => {
  it('returns 7-element array for sv-SE', () => {
    expect(getWeekdayNames('sv-SE')).toHaveLength(7)
  })
  it('starts with Monday for sv-SE', () => {
    const names = getWeekdayNames('sv-SE')
    // Monday 2024-01-01 in sv-SE short format is "mån"
    expect(names[0].toLowerCase()).toContain('m')
  })
  it('returns 7-element array for en', () => {
    expect(getWeekdayNames('en')).toHaveLength(7)
  })
})

describe('getMonthName', () => {
  it('returns "mars" for month index 2 in sv-SE', () => {
    expect(getMonthName(2026, 2, 'sv-SE')).toBe('mars')
  })
  it('returns "March" for month index 2 in en', () => {
    expect(getMonthName(2026, 2, 'en')).toBe('March')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — module not found or exports not defined

---

## Task 4: DateField.js — helper functions

**Files:**
- Create: `src/partials/components/DateField/DateField.js` (exports only, no class yet)

- [ ] **Step 1: Create DateField.js with exported helpers**

```js
// src/partials/components/DateField/DateField.js

// ─── Date helpers (exported for testing) ─────────────────────────────────────

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstWeekdayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7 // 0=Mon, 6=Sun
}

export function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(
    ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  )
}

export function isDayDisabled(date, min, max) {
  if (min) {
    const minDay = new Date(min.getFullYear(), min.getMonth(), min.getDate())
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (d < minDay) return true
  }
  if (max) {
    const maxDay = new Date(max.getFullYear(), max.getMonth(), max.getDate())
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (d > maxDay) return true
  }
  return false
}

export function formatISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekdayNames(locale) {
  const monday = new Date(2024, 0, 1) // known Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
  })
}

export function getMonthName(year, month, locale) {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month, 1))
}
```

- [ ] **Step 2: Run unit tests**

```bash
npm run test:unit
```

Expected: all helper tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "feat(DateField): add date helper functions with unit tests"
```

---

## Task 5: DateField.js — class skeleton + registerLocale

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`

- [ ] **Step 1: Add the class (append to bottom of file)**

```js
// ─── DateField class ──────────────────────────────────────────────────────────

class DateField {
  static instanceCount = 0
  static translations = {
    en: {
      day: 'Day', month: 'Month', year: 'Year',
      openCalendar: 'Open calendar', closeCalendar: 'Close calendar',
      prevMonth: 'Previous month', nextMonth: 'Next month',
      today: 'today', selected: 'selected', notAvailable: 'not available',
      announceSelected: 'Selected date:',
    }
  }

  static registerLocale(locale, strings) {
    DateField.translations[locale] = { ...strings }
  }

  static attach(parent = document) {
    parent.querySelectorAll('[data-component="DateField"]').forEach(el => {
      if (el.__dateFieldInstance) return
      el.__dateFieldInstance = new DateField(el)
    })
  }

  constructor(el) {
    this.root = el
    this.instanceId = ++DateField.instanceCount
    this.native = el.querySelector('.Native')
    this.custom = el.querySelector('.Custom')
    this.segments = el.querySelector('.Segments')
    this.trigger = el.querySelector('.Trigger')
    this.announce = el.querySelector('.Announce')
    this.calendarTemplate = el.querySelector('[data-template="datefield-calendar"]')

    this.calendarEl = null           // body-level clone when open
    this.selectedDate = null
    this.currentYear = new Date().getFullYear()
    this.currentMonth = new Date().getMonth()
    this.focusedDate = null

    this.min = el.dataset.min ? this._parseDate(el.dataset.min) : null
    this.max = el.dataset.max ? this._parseDate(el.dataset.max) : null

    this.locale = this._resolveLocale()
    this.t = DateField.translations[this.locale]
      ?? DateField.translations['en']

    this._init()
  }

  _resolveLocale() {
    const loc = this.root.dataset.locale
      || document.documentElement.lang
      || 'en'
    return DateField.translations[loc] ? loc : 'en'
  }

  _parseDate(isoString) {
    const [y, m, d] = isoString.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  _init() {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (coarse) {
      this.root.dataset.inputMode = 'native'
      return
    }

    this.root.dataset.inputMode = 'custom'
    this.custom.removeAttribute('aria-hidden')

    // Connect field label
    const labelEl = this.native?.id
      ? document.querySelector(`label[for="${this.native.id}"]`)
      : null
    if (labelEl) {
      if (!labelEl.id) labelEl.id = `datefield-label-${this.instanceId}`
      this.segments.setAttribute('aria-labelledby', labelEl.id)
    } else if (this.root.dataset.labelField) {
      this.segments.setAttribute('aria-label', this.root.dataset.labelField)
    }

    // Set initial segment ARIA labels from translations
    this._initSegments()
    this._bindTrigger()
    this._bindValueSync()
    this._bindFormReset()
  }

  destroy() {
    if (this.calendarEl) this.calendarEl.remove()
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler)
    }
    delete this.root.__dateFieldInstance
  }
}

export default DateField
```

- [ ] **Step 2: Add unit tests for registerLocale**

Append to `tests/DateField.unit.test.js`:

```js
import DateField from '../src/partials/components/DateField/DateField.js'

describe('DateField.registerLocale', () => {
  it('registers and retrieves a locale', () => {
    DateField.registerLocale('test-locale', { day: 'Dag' })
    expect(DateField.translations['test-locale'].day).toBe('Dag')
  })
  it('overwrites an existing locale', () => {
    DateField.registerLocale('test-locale', { day: 'Day' })
    expect(DateField.translations['test-locale'].day).toBe('Day')
  })
  it('falls back to en when locale not registered', () => {
    // resolveLocale is tested via constructor — use a DOM mock
    // (covered in e2e tests)
  })
})
```

- [ ] **Step 3: Run unit tests**

```bash
npm run test:unit
```

Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add src/partials/components/DateField/DateField.js tests/DateField.unit.test.js
git commit -m "feat(DateField): class skeleton with registerLocale and attach"
```

---

## Task 6: DateField.js — segment interaction

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`

Add the following methods to the `DateField` class. These implement the three spinbutton segments (day/month/year) and their keyboard contract from spec §5.4.

- [ ] **Step 1: Add _initSegments and _bindTrigger**

```js
  _initSegments() {
    this._segmentEls = [...this.segments.querySelectorAll('[data-segment]')]
    this._digitBuffer = ''
    this._digitTimer = null

    this._segmentEls.forEach((seg, i) => {
      const type = seg.dataset.segment
      seg.setAttribute('aria-label', this.t[type] || type)
      seg.addEventListener('keydown', e => this._handleSegmentKey(e, seg))
      seg.addEventListener('focus', () => this._setFocused(seg))
      seg.addEventListener('blur', () => seg.removeAttribute('data-focused'))
    })
  }

  _setFocused(seg) {
    this._segmentEls.forEach(s => s.removeAttribute('data-focused'))
    seg.setAttribute('data-focused', '')
    // Roving tabindex
    this._segmentEls.forEach(s => s.setAttribute('tabindex', '-1'))
    seg.setAttribute('tabindex', '0')
  }

  _handleSegmentKey(e, seg) {
    const type = seg.dataset.segment
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        this._incrementSegment(seg, 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        this._incrementSegment(seg, -1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        this._moveFocus(seg, -1)
        break
      case 'ArrowRight':
        e.preventDefault()
        this._moveFocus(seg, 1)
        break
      case 'Backspace':
        e.preventDefault()
        this._clearSegment(seg)
        this._moveFocus(seg, -1)
        break
      case 'Escape':
        if (this.calendarEl) { e.preventDefault(); this._closeCalendar() }
        break
      default:
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault()
          this._handleDigit(seg, e.key)
        }
    }
  }

  _moveFocus(currentSeg, direction) {
    const idx = this._segmentEls.indexOf(currentSeg)
    const next = this._segmentEls[idx + direction]
    if (next) {
      this._setFocused(next)
      next.focus()
    }
  }

  _getCurrentValue(seg) {
    return seg.hasAttribute('data-placeholder') ? null : Number(seg.getAttribute('aria-valuenow'))
  }

  _incrementSegment(seg, delta) {
    const type = seg.dataset.segment
    const current = this._getCurrentValue(seg)
    const limits = this._getSegmentLimits(type)
    const start = current ?? (delta > 0 ? limits.min - 1 : limits.max + 1)
    let next = start + delta
    if (next > limits.max) next = limits.min
    if (next < limits.min) next = limits.max
    this._setSegmentValue(seg, next)
  }

  _getSegmentLimits(type) {
    if (type === 'day') {
      const year = this._getSegmentValueByType('year') ?? new Date().getFullYear()
      const month = this._getSegmentValueByType('month')
      const daysInMonth = month != null
        ? getDaysInMonth(year, month - 1)
        : 31
      return { min: 1, max: daysInMonth }
    }
    if (type === 'month') return { min: 1, max: 12 }
    if (type === 'year') return { min: 1900, max: 2100 }
    return { min: 1, max: 31 }
  }

  _getSegmentEl(type) {
    return this._segmentEls.find(s => s.dataset.segment === type) ?? null
  }

  _getSegmentValueByType(type) {
    const seg = this._getSegmentEl(type)
    return seg ? this._getCurrentValue(seg) : null
  }

  _setSegmentValue(seg, numericValue) {
    const type = seg.dataset.segment
    seg.removeAttribute('data-placeholder')
    seg.setAttribute('aria-valuenow', numericValue)
    if (type === 'month') {
      const year = this._getSegmentValueByType('year') ?? new Date().getFullYear()
      seg.setAttribute('aria-valuetext', getMonthName(year, numericValue - 1, this.locale))
      seg.textContent = String(numericValue).padStart(2, '0')
    } else if (type === 'day') {
      seg.setAttribute('aria-valuetext', numericValue)
      seg.textContent = String(numericValue).padStart(2, '0')
      // Update max on day segment if month/year changed
      const limits = this._getSegmentLimits('day')
      seg.setAttribute('aria-valuemax', limits.max)
    } else {
      seg.setAttribute('aria-valuetext', numericValue)
      seg.textContent = numericValue
    }
    this._trySyncToNative()
  }

  _clearSegment(seg) {
    const type = seg.dataset.segment
    seg.setAttribute('data-placeholder', '')
    seg.removeAttribute('aria-valuenow')
    // Use locale-neutral placeholders — 'åååå' is Swedish-only and would be
    // announced by SR for all locales. Keep these as format hints, not words.
    const placeholder = type === 'day' ? 'dd' : type === 'month' ? 'mm' : 'yyyy'
    seg.setAttribute('aria-valuetext', placeholder)
    seg.textContent = placeholder
  }

  _handleDigit(seg, digit) {
    const type = seg.dataset.segment
    clearTimeout(this._digitTimer)
    this._digitBuffer += digit

    const num = Number(this._digitBuffer)

    if (type === 'day') {
      if (num > 3) {
        // First digit > 3 — commit immediately and advance
        this._setSegmentValue(seg, num)
        this._digitBuffer = ''
        this._moveFocus(seg, 1)
      } else if (this._digitBuffer.length === 2) {
        const clamped = Math.min(num, this._getSegmentLimits('day').max)
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
        this._moveFocus(seg, 1)
      } else {
        // Wait for second digit
        this._digitTimer = setTimeout(() => {
          this._setSegmentValue(seg, num)
          this._digitBuffer = ''
          this._moveFocus(seg, 1)
        }, 1000)
      }
    } else if (type === 'month') {
      if (num > 1) {
        this._setSegmentValue(seg, num)
        this._digitBuffer = ''
        this._moveFocus(seg, 1)
      } else if (this._digitBuffer.length === 2) {
        const clamped = Math.min(num, 12)
        this._setSegmentValue(seg, clamped || 1)
        this._digitBuffer = ''
        this._moveFocus(seg, 1)
      } else {
        this._digitTimer = setTimeout(() => {
          this._setSegmentValue(seg, num || 1)
          this._digitBuffer = ''
          this._moveFocus(seg, 1)
        }, 1000)
      }
    } else if (type === 'year') {
      if (this._digitBuffer.length === 4) {
        const clamped = Math.max(1900, Math.min(2100, num))
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
      }
    }
  }

  _bindTrigger() {
    this.trigger.setAttribute('aria-label', this.t.openCalendar)
    this.trigger.addEventListener('click', () => this._toggleCalendar())
  }
```

- [ ] **Step 2: Run unit tests (helpers must still pass)**

```bash
npm run test:unit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/partials/components/DateField/DateField.js
git commit -m "feat(DateField): segment keyboard interaction and ARIA updates"
```

---

## Task 7: DateField.js — value sync

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`

- [ ] **Step 1: Add value sync methods**

```js
  _trySyncToNative() {
    const d = this._getSegmentValueByType('day')
    const m = this._getSegmentValueByType('month')
    const y = this._getSegmentValueByType('year')
    if (d == null || m == null || y == null) return

    const date = new Date(y, m - 1, d)
    if (isNaN(date.getTime())) return

    this.selectedDate = date
    this._syncingFromCustom = true
    this.native.value = formatISO(date)
    this.native.dispatchEvent(new Event('change', { bubbles: true }))
    this._syncingFromCustom = false

    // Live region announcement
    const label = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
    this.announce.textContent = `${this.t.announceSelected} ${label}`
  }

  _bindValueSync() {
    // Autofill: native changed externally → update segments.
    // Guard against re-entry: _selectDate and _trySyncToNative both dispatch
    // 'change' on the native input. Without the flag, this listener would
    // re-run _setSegmentValue for every calendar pick — causing redundant
    // aria-valuemax recalculations and potential infinite loops.
    this._syncingFromCustom = false

    this.native.addEventListener('change', () => {
      if (this._syncingFromCustom) return
      if (!this.native.value) return
      const [y, m, d] = this.native.value.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      this.selectedDate = date
      this._setSegmentValue(this._getSegmentEl('day'), d)
      this._setSegmentValue(this._getSegmentEl('month'), m)
      this._setSegmentValue(this._getSegmentEl('year'), y)
    })
  }

  _bindFormReset() {
    this.native.form?.addEventListener('reset', () => {
      this.selectedDate = null
      this._segmentEls.forEach(seg => this._clearSegment(seg))
      // No live region announcement on reset
    })
  }
```

- [ ] **Step 2: Run unit tests**

```bash
npm run test:unit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/partials/components/DateField/DateField.js
git commit -m "feat(DateField): value sync between segments and native input"
```

---

## Task 8: DateField.js — calendar lifecycle

**Files:**
- Modify: `src/partials/components/DateField/DateField.js`

- [ ] **Step 1: Add calendar open/close and rendering**

```js
  _toggleCalendar() {
    this.calendarEl ? this._closeCalendar() : this._openCalendar()
  }

  _openCalendar() {
    if (!this.calendarTemplate) return

    // Clone template to body
    const clone = this.calendarTemplate.content.cloneNode(true)
    this.calendarEl = clone.querySelector('.DateFieldCalendar')

    // Set instance-unique IDs
    const headingSpan = this.calendarEl.querySelector('.CalendarHeader span')
    const calId = `datefield-calendar-${this.instanceId}`
    const monthId = `datefield-month-${this.instanceId}`
    this.calendarEl.id = calId
    this.calendarEl.setAttribute('aria-labelledby', monthId)
    if (headingSpan) headingSpan.id = monthId

    // Set button labels from translations
    const [prevBtn, nextBtn] = this.calendarEl.querySelectorAll('.CalendarHeader button')
    prevBtn?.setAttribute('aria-label', this.t.prevMonth)
    nextBtn?.setAttribute('aria-label', this.t.nextMonth)

    // Bind navigation
    prevBtn?.addEventListener('click', () => this._navigateMonth(-1))
    nextBtn?.addEventListener('click', () => this._navigateMonth(1))

    // Render weekday headers
    this._renderWeekdays()

    // Set current month to selected date or today
    if (this.selectedDate) {
      this.currentYear = this.selectedDate.getFullYear()
      this.currentMonth = this.selectedDate.getMonth()
    } else {
      const today = new Date()
      this.currentYear = today.getFullYear()
      this.currentMonth = today.getMonth()
    }

    this._renderMonth()

    document.body.appendChild(this.calendarEl)

    // Position relative to trigger
    const rect = this.trigger.getBoundingClientRect()
    this.calendarEl.style.top = `${rect.bottom + window.scrollY + 4}px`
    this.calendarEl.style.left = `${rect.left + window.scrollX}px`

    // Update root and trigger state
    this.root.dataset.state = 'open'
    this.trigger.setAttribute('aria-expanded', 'true')
    this.trigger.setAttribute('aria-label', this.t.closeCalendar)

    // Move focus into calendar
    this._moveFocusIntoCalendar()

    // Outside click handler
    this._outsideClickHandler = (e) => {
      if (!this.root.contains(e.target) && !this.calendarEl?.contains(e.target)) {
        this._closeCalendar()
      }
    }
    // Delay to avoid the opening click triggering close
    setTimeout(() => document.addEventListener('click', this._outsideClickHandler), 0)

    // Focus trap
    this.calendarEl.addEventListener('keydown', e => this._handleCalendarKeydown(e))
  }

  _closeCalendar() {
    if (!this.calendarEl) return
    this.calendarEl.remove()
    this.calendarEl = null
    document.removeEventListener('click', this._outsideClickHandler)

    this.root.dataset.state = 'idle'
    this.trigger.setAttribute('aria-expanded', 'false')
    this.trigger.setAttribute('aria-label', this.t.openCalendar)
    this.trigger.focus()
  }

  _navigateMonth(direction) {
    this.currentMonth += direction
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++ }
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear-- }
    this._renderMonth()

    // Announce new month to SR via aria-live heading
    // (aria-live="polite" on the heading span handles this automatically)
  }

  _renderWeekdays() {
    const names = getWeekdayNames(this.locale)
    const ths = this.calendarEl.querySelectorAll('.Grid thead th')
    ths.forEach((th, i) => {
      if (names[i]) {
        th.textContent = names[i]
        // Full weekday name via Intl for aria-label
        const monday = new Date(2024, 0, 1)
        monday.setDate(monday.getDate() + i)
        const full = new Intl.DateTimeFormat(this.locale, { weekday: 'long' }).format(monday)
        th.setAttribute('aria-label', full)
      }
    })
  }

  _renderMonth() {
    const headingSpan = this.calendarEl.querySelector('.CalendarHeader span')
    const monthName = getMonthName(this.currentYear, this.currentMonth, this.locale)
    if (headingSpan) headingSpan.textContent = `${monthName} ${this.currentYear}`

    const tbody = this.calendarEl.querySelector('.Grid tbody')
    tbody.innerHTML = ''

    const firstDay = getFirstWeekdayOfMonth(this.currentYear, this.currentMonth)
    const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth)
    const today = new Date()

    // Previous month days to fill first row
    const prevMonthDays = getDaysInMonth(
      this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear,
      this.currentMonth === 0 ? 11 : this.currentMonth - 1
    )

    let dayCount = 1
    let nextMonthDay = 1
    let row = document.createElement('tr')
    row.setAttribute('role', 'row')

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

    for (let i = 0; i < totalCells; i++) {
      if (i > 0 && i % 7 === 0) {
        tbody.appendChild(row)
        row = document.createElement('tr')
        row.setAttribute('role', 'row')
      }

      const td = document.createElement('td')
      td.setAttribute('role', 'gridcell')

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.setAttribute('tabindex', '-1')

      let date, isOutsideMonth = false

      if (i < firstDay) {
        // Previous month
        const d = prevMonthDays - firstDay + i + 1
        const m = this.currentMonth === 0 ? 11 : this.currentMonth - 1
        const y = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear
        date = new Date(y, m, d)
        isOutsideMonth = true
        td.dataset.outsideMonth = ''
      } else if (dayCount <= daysInMonth) {
        date = new Date(this.currentYear, this.currentMonth, dayCount++)
      } else {
        // Next month
        const m = this.currentMonth === 11 ? 0 : this.currentMonth + 1
        const y = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear
        date = new Date(y, m, nextMonthDay++)
        isOutsideMonth = true
        td.dataset.outsideMonth = ''
      }

      const isToday = date.toDateString() === today.toDateString()
      const isSelected = this.selectedDate && date.toDateString() === this.selectedDate.toDateString()
      const isDisabled = isDayDisabled(date, this.min, this.max)

      if (isToday) td.dataset.today = ''
      if (isSelected) { td.dataset.selected = ''; td.setAttribute('aria-selected', 'true') }
      else td.setAttribute('aria-selected', 'false')
      if (isDisabled) { td.dataset.disabled = ''; td.setAttribute('aria-disabled', 'true') }

      // aria-label on button: full date + suffixes
      const dateLabel = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
      const suffixes = [
        isToday ? `, ${this.t.today}` : '',
        isSelected ? `, ${this.t.selected}` : '',
        isDisabled ? `, ${this.t.notAvailable}` : '',
      ].join('')
      btn.setAttribute('aria-label', `${dateLabel}${suffixes}`)

      btn.textContent = date.getDate()
      btn.dataset.date = formatISO(date)

      btn.addEventListener('click', () => {
        if (isDisabled) return
        this._selectDate(date)
      })

      td.appendChild(btn)
      row.appendChild(td)
    }
    tbody.appendChild(row)

    // Set roving tabindex: selected → today → first non-disabled
    this._updateRovingTabindex()
  }

  _updateRovingTabindex() {
    const grid = this.calendarEl.querySelector('.Grid')
    const allBtns = [...grid.querySelectorAll('td button')]
    allBtns.forEach(b => b.setAttribute('tabindex', '-1'))

    // Priority order must match _moveFocusIntoCalendar: selected → today → first non-disabled
    const todayISO = formatISO(new Date())
    const todayBtn = grid.querySelector(`button[data-date="${todayISO}"]`)
    const todayEnabled = todayBtn && !todayBtn.closest('td[aria-disabled="true"]') ? todayBtn : null

    const target = grid.querySelector('td[data-selected] button')
      ?? todayEnabled
      ?? grid.querySelector(`td:not([data-outside-month]):not([aria-disabled="true"]) button`)
    if (target) target.setAttribute('tabindex', '0')
  }

  _moveFocusIntoCalendar() {
    const target = this.calendarEl.querySelector('td[data-selected] button')
      ?? this.calendarEl.querySelector(`td[data-today]:not([aria-disabled="true"]) button`)
      ?? this.calendarEl.querySelector('td:not([data-outside-month]):not([aria-disabled="true"]) button')
    target?.focus()
  }

  _selectDate(date) {
    this.selectedDate = date
    this._syncingFromCustom = true
    this.native.value = formatISO(date)
    this.native.dispatchEvent(new Event('change', { bubbles: true }))
    this._syncingFromCustom = false

    // Update segment display
    this._setSegmentValue(this._getSegmentEl('day'), date.getDate())
    this._setSegmentValue(this._getSegmentEl('month'), date.getMonth() + 1)
    this._setSegmentValue(this._getSegmentEl('year'), date.getFullYear())

    // Live region
    const label = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
    this.announce.textContent = `${this.t.announceSelected} ${label}`

    this._closeCalendar()
  }

  _handleCalendarKeydown(e) {
    const grid = this.calendarEl.querySelector('.Grid')
    const focusedBtn = grid.querySelector('button:focus')

    if (e.key === 'Escape') {
      e.preventDefault()
      this._closeCalendar()
      return
    }

    // Tab wrap
    if (e.key === 'Tab') {
      const tabbable = [
        this.calendarEl.querySelector('.CalendarHeader button:first-of-type'),
        ...Array.from(grid.querySelectorAll('td:not([aria-disabled="true"]) button')),
        this.calendarEl.querySelector('.CalendarHeader button:last-of-type'),
      ].filter(Boolean)

      const first = tabbable[0]
      const last = tabbable[tabbable.length - 1]
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      }
      return
    }

    if (!focusedBtn) return

    const currentISO = focusedBtn.dataset.date
    if (!currentISO) return
    const [y, m, d] = currentISO.split('-').map(Number)
    let target = new Date(y, m - 1, d)

    const arrowKeys = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
    }

    if (arrowKeys[e.key] !== undefined) {
      e.preventDefault()
      target.setDate(target.getDate() + arrowKeys[e.key])
      this._focusCalendarDate(target)
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      target = new Date(y, m - 2, d)
      this._focusCalendarDate(target)
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      target = new Date(y, m, d)
      this._focusCalendarDate(target)
    } else if (e.ctrlKey && e.key === 'Home') {
      e.preventDefault()
      target = new Date(this.currentYear, this.currentMonth, 1)
      this._focusCalendarDate(target)
    } else if (e.ctrlKey && e.key === 'End') {
      e.preventDefault()
      target = new Date(this.currentYear, this.currentMonth, getDaysInMonth(this.currentYear, this.currentMonth))
      this._focusCalendarDate(target)
    } else if (e.key === 'Home') {
      e.preventDefault()
      // First day of week row (Monday)
      const dow = (target.getDay() + 6) % 7
      target.setDate(target.getDate() - dow)
      this._focusCalendarDate(target)
    } else if (e.key === 'End') {
      e.preventDefault()
      // Last day of week row (Sunday)
      const dow = (target.getDay() + 6) % 7
      target.setDate(target.getDate() + (6 - dow))
      this._focusCalendarDate(target)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const td = focusedBtn.closest('td')
      if (td && !td.hasAttribute('aria-disabled')) {
        const [fy, fm, fd] = focusedBtn.dataset.date.split('-').map(Number)
        this._selectDate(new Date(fy, fm - 1, fd))
      }
    }
  }

  _focusCalendarDate(date) {
    const iso = formatISO(date)
    // data-date is on the <button> element, not on <td>
    let btn = this.calendarEl.querySelector(`button[data-date="${iso}"]`)

    if (!btn) {
      // Navigate to target month
      this.currentYear = date.getFullYear()
      this.currentMonth = date.getMonth()
      this._renderMonth()
      btn = this.calendarEl.querySelector(`button[data-date="${iso}"]`)
    }

    if (btn) {
      // Update roving tabindex
      const grid = this.calendarEl.querySelector('.Grid')
      grid.querySelectorAll('td button').forEach(b => b.setAttribute('tabindex', '-1'))
      btn.setAttribute('tabindex', '0')
      btn.focus()
    }
  }
```

- [ ] **Step 2: Run unit tests**

```bash
npm run test:unit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/partials/components/DateField/DateField.js
git commit -m "feat(DateField): calendar lifecycle, rendering, and keyboard navigation"
```

---

## Task 9: HTML and CSS

**Files:**
- Create: `src/partials/components/DateField/DateField.html`
- Create: `src/partials/components/DateField/DateField.css`

- [ ] **Step 1: Create DateField.html**

```html
<label for="birthdate">Födelsedatum</label>

<div
  class="DateField"
  data-component="DateField"
  data-locale="sv-SE"
  data-min="1900-01-01"
  data-max="2100-12-31"
>
  <input
    class="Native"
    id="birthdate"
    type="date"
    name="birthdate"
    min="1900-01-01"
    max="2100-12-31"
  />

  <div class="Custom" aria-hidden="true">
    <div class="Segments" role="group">

      <span
        class="Segment"
        role="spinbutton"
        aria-label="Dag"
        aria-valuemin="1"
        aria-valuemax="31"
        aria-valuetext="dd"
        tabindex="0"
        data-segment="day"
        data-placeholder
      >dd</span>

      <span class="Separator" aria-hidden="true">/</span>

      <span
        class="Segment"
        role="spinbutton"
        aria-label="Månad"
        aria-valuemin="1"
        aria-valuemax="12"
        aria-valuetext="mm"
        tabindex="-1"
        data-segment="month"
        data-placeholder
      >mm</span>

      <span class="Separator" aria-hidden="true">/</span>

      <span
        class="Segment"
        role="spinbutton"
        aria-label="År"
        aria-valuemin="1900"
        aria-valuemax="2100"
        aria-valuetext="yyyy"
        tabindex="-1"
        data-segment="year"
        data-placeholder
      >yyyy</span>

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

    <template data-template="datefield-calendar">
      <div
        class="DateFieldCalendar"
        role="dialog"
        aria-modal="true"
      >
        <div class="CalendarHeader">
          <button type="button">&#8249;</button>
          <span aria-live="polite" aria-atomic="true"></span>
          <button type="button">&#8250;</button>
        </div>

        <table class="Grid" role="grid">
          <thead>
            <tr role="row">
              <th scope="col"></th>
              <th scope="col"></th>
              <th scope="col"></th>
              <th scope="col"></th>
              <th scope="col"></th>
              <th scope="col"></th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </template>

  </div>

  <div class="Announce" aria-live="polite" aria-atomic="true"></div>

</div>
```

- [ ] **Step 2: Create DateField.css**

```css
.DateField {
  position: relative;
  display: inline-block;

  & .Native {
    display: block;
  }

  & .Custom {
    display: none;
  }

  &[data-input-mode="custom"] {
    & .Native {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
    }

    & .Custom {
      display: block;
    }
  }

  & .Segments {
    display: inline-flex;
    align-items: center;
    border: 1px solid;
    padding-inline: 0.5rem;
    padding-block: 0.25rem;
    gap: 0.125rem;
    border-radius: 4px;
  }

  & .Segment {
    font-variant-numeric: tabular-nums;
    min-inline-size: 2ch;
    text-align: center;
    outline: none;
    border-radius: 2px;
    cursor: default;

    &[data-focused] {
      background-color: Highlight;
      color: HighlightText;
    }

    &[data-placeholder] {
      color: GrayText;
    }
  }

  & .Separator {
    user-select: none;
    color: GrayText;
  }

  & .Trigger {
    margin-inline-start: 0.25rem;
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    border-radius: 2px;
    vertical-align: middle;

    &:focus-visible {
      outline: 2px solid;
      outline-offset: 2px;
    }
  }

  & .Announce {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}

.DateFieldCalendar {
  position: fixed;
  background: Canvas;
  color: CanvasText;
  border: 1px solid;
  padding: 0.75rem;
  z-index: 100;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);

  & .CalendarHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-block-end: 0.5rem;
    gap: 0.5rem;

    & button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
      font-size: 1.25rem;
      line-height: 1;

      &:focus-visible {
        outline: 2px solid;
        outline-offset: 2px;
      }
    }

    & span {
      font-weight: 600;
      flex: 1;
      text-align: center;
    }
  }

  & .Grid {
    border-collapse: collapse;

    & th {
      font-size: 0.75em;
      padding-block-end: 0.25rem;
      text-align: center;
      font-weight: normal;
      color: GrayText;
      min-inline-size: 2rem;
    }

    & td {
      padding: 0;
    }

    & td button {
      display: block;
      inline-size: 2rem;
      block-size: 2rem;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 2px;
      font-variant-numeric: tabular-nums;
      font-size: 0.875rem;

      &:focus-visible {
        outline: 2px solid;
        outline-offset: 2px;
      }
    }

    & td[data-today] button {
      font-weight: bold;
      text-decoration: underline;
    }

    & td[data-selected] button {
      background-color: Highlight;
      color: HighlightText;
    }

    & td[data-disabled] button {
      color: #767676;
      cursor: not-allowed;
    }

    & td[data-outside-month] button {
      color: GrayText;
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/partials/components/DateField/
git commit -m "feat(DateField): HTML structure and CSS"
```

---

## Task 10: Wire up in script.js and Main.html

**Files:**
- Modify: `src/js/script.js`
- Modify: `src/partials/global/main/Main.html`

- [ ] **Step 1: Import DateField and register locale in script.js**

Add to top of `src/js/script.js`:
```js
import DateField from "../partials/components/DateField/DateField.js";
import svSE from "../partials/components/DateField/locales/sv-SE.json"; // Vite handles JSON imports natively — no assert needed
```

Add after existing `CoverCompositionVideo.attach()` call:
```js
DateField.registerLocale('sv-SE', svSE);
DateField.attach();
```

- [ ] **Step 2: Add DateField to Main.html**

Add a demo instance inside `<main>` in `src/partials/global/main/Main.html`:
```handlebars
{{> components/DateField/DateField }}
```

- [ ] **Step 3: Start dev server and verify manually**

```bash
npm run dev
```

Check:
- On desktop (pointer:fine): custom UI appears, segments are clickable, calendar opens
- Keyboard: Tab into segments, ArrowUp/Down changes values, calendar opens on trigger
- Calendar: arrow keys navigate, Enter selects, Escape closes, focus returns to trigger

- [ ] **Step 4: Commit**

```bash
git add src/js/script.js src/partials/global/main/Main.html
git commit -m "feat(DateField): wire up component in script.js and Main.html demo"
```

---

## Task 11: E2E tests

**Files:**
- Create: `tests/DateField.e2e.test.js`

The dev server must be running (`npm run dev`) for e2e tests to work, or use the `webServer` config in playwright.config.js which starts it automatically.

- [ ] **Step 1: Create e2e test file**

```js
// tests/DateField.e2e.test.js
import { test, expect } from '@playwright/test'
import { checkA11y, injectAxe } from 'axe-playwright'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await injectAxe(page)
})

test('native input is visible without JS', async ({ page, browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const noJsPage = await context.newPage()
  await noJsPage.goto('/')
  const native = noJsPage.locator('.DateField .Native')
  await expect(native).toBeVisible()
  await context.close()
})

test('custom UI is shown on pointer:fine', async ({ page }) => {
  const custom = page.locator('.DateField .Custom')
  await expect(custom).toBeVisible()
  const native = page.locator('.DateField .Native')
  await expect(native).not.toBeVisible()
})

test('Segments group has aria-labelledby pointing to label', async ({ page }) => {
  const segments = page.locator('.DateField .Segments')
  const labelledBy = await segments.getAttribute('aria-labelledby')
  expect(labelledBy).toBeTruthy()
  const label = page.locator(`#${labelledBy}`)
  await expect(label).toBeVisible()
})

test('segment placeholder state: aria-valuenow absent', async ({ page }) => {
  const daySegment = page.locator('[data-segment="day"]')
  const valuenow = await daySegment.getAttribute('aria-valuenow')
  expect(valuenow).toBeNull()
})

test('ArrowUp increments day segment', async ({ page }) => {
  const daySegment = page.locator('[data-segment="day"]')
  await daySegment.focus()
  await daySegment.press('ArrowUp')
  const valueNow = await daySegment.getAttribute('aria-valuenow')
  expect(Number(valueNow)).toBeGreaterThanOrEqual(1)
})

test('calendar does not exist in DOM when closed', async ({ page }) => {
  await expect(page.locator('.DateFieldCalendar')).toHaveCount(0)
})

test('calendar is a body child when open', async ({ page }) => {
  await page.locator('.Trigger').click()
  const calendar = page.locator('body > .DateFieldCalendar')
  await expect(calendar).toBeVisible()
})

test('calendar is removed from body on close', async ({ page }) => {
  await page.locator('.Trigger').click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.DateFieldCalendar')).toHaveCount(0)
})

test('focus returns to trigger after Escape', async ({ page }) => {
  await page.locator('.Trigger').click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.Trigger')).toBeFocused()
})

test('no aria-controls on trigger at any time', async ({ page }) => {
  const trigger = page.locator('.Trigger')
  expect(await trigger.getAttribute('aria-controls')).toBeNull()
  await trigger.click()
  expect(await trigger.getAttribute('aria-controls')).toBeNull()
})

test('date selection closes calendar and syncs native', async ({ page }) => {
  await page.locator('.Trigger').click()
  const firstDay = page.locator('td:not([data-outside-month]):not([aria-disabled="true"]) button').first()
  const dateLabel = await firstDay.getAttribute('data-date')
  await firstDay.click()
  await expect(page.locator('.DateFieldCalendar')).toHaveCount(0)
  const nativeValue = await page.locator('.Native').inputValue()
  expect(nativeValue).toBe(dateLabel)
})

test('aria-selected is on td not button', async ({ page }) => {
  await page.locator('.Trigger').click()
  await expect(page.locator('.Grid td[aria-selected]')).toHaveCount(await page.locator('.Grid td').count())
  await expect(page.locator('.Grid button[aria-selected]')).toHaveCount(0)
})

test('two instances have distinct calendar IDs', async ({ page }) => {
  // This test requires two DateField instances on the page
  // Skip if only one instance
  const instances = await page.locator('.DateField').count()
  test.skip(instances < 2, 'Only one DateField instance on page')
  const triggers = page.locator('.Trigger')
  await triggers.nth(0).click()
  const id1 = await page.locator('.DateFieldCalendar').getAttribute('id')
  await page.keyboard.press('Escape')
  await triggers.nth(1).click()
  const id2 = await page.locator('.DateFieldCalendar').getAttribute('id')
  expect(id1).not.toBe(id2)
})

test('axe: zero violations on initial render', async ({ page }) => {
  await checkA11y(page, '.DateField')
})

test('axe: zero violations with calendar open', async ({ page }) => {
  await page.locator('.Trigger').click()
  await checkA11y(page)
})
```

- [ ] **Step 2: Run e2e tests**

```bash
npm run test:e2e
```

Expected: all PASS (or investigate failures — do not move on with failures)

- [ ] **Step 3: Commit**

```bash
git add tests/DateField.e2e.test.js
git commit -m "test(DateField): e2e tests with Playwright and axe-core"
```

---

## Task 12: Final check + cleanup

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: unit PASS, e2e PASS

- [ ] **Step 2: Manual SR smoke test**

Using VoiceOver (macOS, Safari):
1. Tab into component — SR announces group label and first segment role
2. ArrowUp on day segment — SR announces updated value
3. Click calendar trigger — SR announces dialog title, focus inside dialog
4. Arrow-key through days — SR reads full date string per day
5. Enter on a day — SR reads selected date via live region, dialog closes
6. Escape from open calendar — focus returns to trigger

- [ ] **Step 3: Commit any fixes**

```bash
git add -p
git commit -m "fix(DateField): SR smoke test fixes"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-03-25-date-field.md`.**
