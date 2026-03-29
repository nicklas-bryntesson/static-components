# DateField TypeScript Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `DateField.js` and `DateField.unit.test.js` to TypeScript with `strict: true`, installing and configuring the TypeScript toolchain, without any logic changes.

**Architecture:** Vite's built-in transpile-only TS support (no `tsc` in the build pipeline). A `tsconfig.json` at the project root covers `src/**/*.ts` and `tests/**/*.ts`. Type-checking is done via `npm run typecheck` (`tsc --noEmit`). The component gets rich types including module augmentation for the DOM properties it attaches at runtime.

**Tech Stack:** TypeScript 5.x, Vite (built-in TS support), Vitest (handles `.ts` natively via Vite).

---

## File Map

| Action | Path |
|--------|------|
| Install | `typescript` devDependency |
| Create | `tsconfig.json` |
| Modify | `package.json` — add `typecheck` script |
| Modify | `vitest.config.js` — extend exclude pattern |
| Rename + rewrite | `src/partials/components/DateField/DateField.js` → `DateField.ts` |
| Modify | `src/js/script.js` — update import path |
| Rename + rewrite | `tests/DateField.unit.test.js` → `DateField.unit.test.ts` |

---

## Task 1: Install TypeScript and configure tooling

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json`
- Modify: `vitest.config.js`

- [ ] **Step 1: Install TypeScript**

```bash
cd /Users/nicklas-bryntesson/Desktop/static-components
npm install --save-dev typescript
```

Expected: `typescript` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Create tsconfig.json**

Create `/Users/nicklas-bryntesson/Desktop/static-components/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: Add typecheck script to package.json**

In `package.json`, add `"typecheck": "tsc --noEmit"` to the `scripts` object:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test:unit": "vitest run --passWithNoTests",
  "test:e2e": "playwright test",
  "test": "vitest run && playwright test",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 4: Update vitest.config.js to exclude .ts e2e tests**

Current `vitest.config.js`:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['**/*.e2e.test.js', 'node_modules/**', '.worktrees/**'],
  },
})
```

Update the exclude array to:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['**/*.e2e.test.js', '**/*.e2e.test.ts', 'node_modules/**', '.worktrees/**'],
  },
})
```

- [ ] **Step 5: Verify typecheck passes with no .ts files yet**

```bash
npm run typecheck
```

Expected output: exits 0 with no errors (nothing to check yet).

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json package.json vitest.config.js package-lock.json
git commit -m "chore: install typescript, add tsconfig and typecheck script"
```

---

## Task 2: Convert DateField.js to DateField.ts

**Files:**
- Rename + rewrite: `src/partials/components/DateField/DateField.js` → `DateField.ts`
- Modify: `src/js/script.js`

- [ ] **Step 1: Confirm unit tests are green before touching anything**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 2: Delete DateField.js and create DateField.ts**

Delete `src/partials/components/DateField/DateField.js` and create `src/partials/components/DateField/DateField.ts` with this content:

```ts
// src/partials/components/DateField/DateField.ts

// ─── Types ────────────────────────────────────────────────────────────────────

type SegmentType = 'day' | 'month' | 'year'

interface TranslationStrings {
  day: string
  month: string
  year: string
  openCalendar: string
  closeCalendar: string
  prevMonth: string
  nextMonth: string
  today: string
  selected: string
  notAvailable: string
  announceSelected: string
}

interface SegmentHandlers {
  keydown: (e: KeyboardEvent) => void
  focus: () => void
  blur: () => void
}

declare global {
  interface HTMLElement {
    __dateFieldInstance?: DateField
  }
  interface HTMLSpanElement {
    __dateFieldHandlers?: SegmentHandlers
  }
}

// ─── Date helpers (exported for testing) ─────────────────────────────────────

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstWeekdayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7 // 0=Mon, 6=Sun
}

export function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  )
}

export function isDayDisabled(date: Date, min: Date | null, max: Date | null): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (min) {
    const minDay = new Date(min.getFullYear(), min.getMonth(), min.getDate())
    if (d < minDay) return true
  }
  if (max) {
    const maxDay = new Date(max.getFullYear(), max.getMonth(), max.getDate())
    if (d > maxDay) return true
  }
  return false
}

export function formatISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekdayNames(locale: string): string[] {
  const monday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
  })
}

export function getMonthName(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month, 1))
}

export function getSegmentOrder(locale: string): { order: SegmentType[]; separator: string } {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(2026, 0, 15))

    const order: SegmentType[] = []
    let separator = '/'

    for (const part of parts) {
      if (part.type === 'day' || part.type === 'month' || part.type === 'year') {
        order.push(part.type)
      } else if (part.type === 'literal' && order.length > 0 && order.length < 3) {
        const stripped = part.value.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '').trim()
        if (stripped) separator = stripped
      }
    }

    if (order.length === 3) return { order, separator }
  } catch (_) {}

  return { order: ['day', 'month', 'year'], separator: '/' }
}

// ─── DateField class ──────────────────────────────────────────────────────────

class DateField {
  static instanceCount: number = 0
  static translations: Record<string, TranslationStrings> = {
    en: {
      day: 'Day', month: 'Month', year: 'Year',
      openCalendar: 'Open calendar', closeCalendar: 'Close calendar',
      prevMonth: 'Previous month', nextMonth: 'Next month',
      today: 'today', selected: 'selected', notAvailable: 'not available',
      announceSelected: 'Selected date:',
    }
  }

  // DOM refs
  root: HTMLElement
  native: HTMLInputElement
  custom: HTMLElement
  segments: HTMLElement
  trigger: HTMLButtonElement
  announce: HTMLElement
  calendarTemplate: HTMLTemplateElement | null

  // State
  calendarEl: HTMLElement | null
  selectedDate: Date | null
  currentYear: number
  currentMonth: number
  instanceId: number
  locale: string
  t: TranslationStrings
  min: Date | null
  max: Date | null

  // Internal
  _syncingFromCustom: boolean
  _segmentEls: HTMLSpanElement[]
  _digitBuffer: string
  _digitTimer: ReturnType<typeof setTimeout> | null
  _outsideClickHandler: ((e: MouseEvent) => void) | null
  _handleTriggerClick: () => void
  _handleNativeChange: () => void
  _handleFormReset: () => void

  static registerLocale(locale: string, strings: Partial<TranslationStrings>): void {
    DateField.translations[locale] = { ...DateField.translations.en, ...strings }
  }

  static attach(parent: Document | HTMLElement = document): void {
    parent.querySelectorAll('[data-component="DateField"]').forEach(el => {
      const htmlEl = el as HTMLElement
      if (htmlEl.__dateFieldInstance) return
      htmlEl.__dateFieldInstance = new DateField(htmlEl)
    })
  }

  constructor(el: HTMLElement) {
    this.root = el
    this.instanceId = ++DateField.instanceCount
    this.native = el.querySelector<HTMLInputElement>('.Native')!
    this.custom = el.querySelector<HTMLElement>('.Custom')!
    this.segments = el.querySelector<HTMLElement>('.Segments')!
    this.trigger = el.querySelector<HTMLButtonElement>('.Trigger')!
    this.announce = el.querySelector<HTMLElement>('.Announce')!
    this.calendarTemplate = el.querySelector<HTMLTemplateElement>('[data-template="datefield-calendar"]')

    this.calendarEl = null
    this.selectedDate = null
    this.currentYear = new Date().getFullYear()
    this.currentMonth = new Date().getMonth()
    this._syncingFromCustom = false
    this._segmentEls = []
    this._digitBuffer = ''
    this._digitTimer = null
    this._outsideClickHandler = null

    this._handleTriggerClick = () => this._toggleCalendar()
    this._handleNativeChange = () => {
      if (this._syncingFromCustom) return
      if (!this.native.value) return
      const [y, m, d] = this.native.value.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      this.selectedDate = date
      this._setSegmentValue(this._getSegmentEl('day')!, d)
      this._setSegmentValue(this._getSegmentEl('month')!, m)
      this._setSegmentValue(this._getSegmentEl('year')!, y)
    }
    this._handleFormReset = () => {
      this.selectedDate = null
      this._segmentEls.forEach(seg => this._clearSegment(seg))
    }

    this.min = el.dataset.min ? this._parseDate(el.dataset.min) : null
    this.max = el.dataset.max ? this._parseDate(el.dataset.max) : null

    this.locale = this._resolveLocale()
    this.t = DateField.translations[this.locale] ?? DateField.translations['en']

    this._init()
  }

  _resolveLocale(): string {
    const loc = this.root.dataset.locale || document.documentElement.lang || 'en'
    return DateField.translations[loc] ? loc : 'en'
  }

  _parseDate(isoString: string): Date {
    const [y, m, d] = isoString.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  _init(): void {
    const coarse = (typeof window.matchMedia === 'function')
      ? window.matchMedia('(pointer: coarse)').matches
      : false
    if (coarse) {
      this._initDisplay()
      return
    }
    this._initInteractive()
  }

  _initInteractive(): void {
    this.root.dataset.inputMode = 'custom'
    this.custom.removeAttribute('aria-hidden')

    const labelEl = this.native?.id
      ? document.querySelector<HTMLLabelElement>(`label[for="${this.native.id}"]`)
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

  destroy(): void {
    if (this.calendarEl) this.calendarEl.remove()
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler)
    }

    this.trigger?.removeEventListener('click', this._handleTriggerClick)
    this.native?.removeEventListener('change', this._handleNativeChange)

    if (this.native?.form && this._handleFormReset) {
      this.native.form.removeEventListener('reset', this._handleFormReset)
    }

    this._segmentEls.forEach(seg => {
      const handlers = seg.__dateFieldHandlers
      if (handlers) {
        seg.removeEventListener('keydown', handlers.keydown)
        seg.removeEventListener('focus', handlers.focus)
        seg.removeEventListener('blur', handlers.blur)
        delete seg.__dateFieldHandlers
      }
    })

    this.custom?.setAttribute('aria-hidden', 'true')
    delete this.root.__dateFieldInstance
  }

  // ─── Segments ───────────────────────────────────────────────────────────────

  _createSegmentEl(type: SegmentType): HTMLSpanElement {
    const span = document.createElement('span')
    span.className = 'Segment'
    span.setAttribute('role', 'spinbutton')
    span.setAttribute('aria-label', this.t[type] || type)
    span.setAttribute('data-segment', type)
    span.setAttribute('data-placeholder', '')
    span.setAttribute('tabindex', '-1')

    const limits = this._getSegmentLimits(type)
    span.setAttribute('aria-valuemin', String(limits.min))
    span.setAttribute('aria-valuemax', String(limits.max))

    const placeholder = type === 'day' ? 'dd' : type === 'month' ? 'mm' : 'yyyy'
    span.setAttribute('aria-valuetext', placeholder)
    span.textContent = placeholder

    return span
  }

  _buildSegments(): void {
    this.segments.querySelectorAll('.Segment, .Separator').forEach(el => el.remove())

    const { order, separator } = getSegmentOrder(this.locale)

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

    this._segmentEls = [...this.segments.querySelectorAll<HTMLSpanElement>('[data-segment]')]
    if (this._segmentEls.length > 0) {
      this._segmentEls[0].setAttribute('tabindex', '0')
    }

    if (this.native.disabled) {
      this._segmentEls.forEach(seg => seg.setAttribute('tabindex', '-1'))
    }
  }

  _bindSegmentEvents(): void {
    this._segmentEls.forEach(seg => {
      const keydownHandler = (e: KeyboardEvent) => this._handleSegmentKey(e, seg)
      const focusHandler = () => this._setSegmentFocused(seg)
      const blurHandler = () => seg.removeAttribute('data-focused')
      seg.__dateFieldHandlers = { keydown: keydownHandler, focus: focusHandler, blur: blurHandler }
      seg.addEventListener('keydown', keydownHandler)
      seg.addEventListener('focus', focusHandler)
      seg.addEventListener('blur', blurHandler)
    })
  }

  _initDisplay(): void {
    this.root.dataset.inputMode = 'display'
    if (this.native.disabled) this.root.dataset.disabled = ''

    this._buildSegments()
    this._segmentEls.forEach(seg => seg.setAttribute('tabindex', '-1'))

    this.native.addEventListener('change', this._handleNativeChange)
    this.native.form?.addEventListener('reset', this._handleFormReset)

    if (this.native.value) this._syncInitialValue()
  }

  _setSegmentFocused(seg: HTMLSpanElement): void {
    this._segmentEls.forEach(s => {
      s.removeAttribute('data-focused')
      s.setAttribute('tabindex', '-1')
    })
    seg.setAttribute('data-focused', '')
    seg.setAttribute('tabindex', '0')
  }

  _handleSegmentKey(e: KeyboardEvent, seg: HTMLSpanElement): void {
    if (this.native.disabled) return
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
        this._moveSegmentFocus(seg, -1)
        break
      case 'ArrowRight':
        e.preventDefault()
        this._moveSegmentFocus(seg, 1)
        break
      case 'Backspace':
        e.preventDefault()
        this._clearSegment(seg)
        this._moveSegmentFocus(seg, -1)
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

  _moveSegmentFocus(current: HTMLSpanElement, direction: number): void {
    const idx = this._segmentEls.indexOf(current)
    const next = this._segmentEls[idx + direction]
    if (next) { this._setSegmentFocused(next); next.focus() }
  }

  _getCurrentSegmentValue(seg: HTMLSpanElement): number | null {
    return seg.hasAttribute('data-placeholder') ? null : Number(seg.getAttribute('aria-valuenow'))
  }

  _getSegmentEl(type: SegmentType): HTMLSpanElement | null {
    return this._segmentEls.find(s => s.dataset.segment === type) ?? null
  }

  _getSegmentValueByType(type: SegmentType): number | null {
    const seg = this._getSegmentEl(type)
    return seg ? this._getCurrentSegmentValue(seg) : null
  }

  _getSegmentLimits(type: SegmentType): { min: number; max: number } {
    if (type === 'day') {
      const year = this._getSegmentValueByType('year') ?? new Date().getFullYear()
      const month = this._getSegmentValueByType('month')
      const daysInMonth = month != null ? getDaysInMonth(year, month - 1) : 31
      return { min: 1, max: daysInMonth }
    }
    if (type === 'month') return { min: 1, max: 12 }
    return {
      min: this.min ? this.min.getFullYear() : 1900,
      max: this.max ? this.max.getFullYear() : 2100,
    }
  }

  _incrementSegment(seg: HTMLSpanElement, delta: number): void {
    const type = seg.dataset.segment as SegmentType
    const current = this._getCurrentSegmentValue(seg)
    const limits = this._getSegmentLimits(type)
    const start = current ?? (delta > 0 ? limits.min - 1 : limits.max + 1)
    let next = start + delta
    if (next > limits.max) next = limits.min
    if (next < limits.min) next = limits.max
    this._setSegmentValue(seg, next)
  }

  _setSegmentValue(seg: HTMLSpanElement, numericValue: number): void {
    const type = seg.dataset.segment as SegmentType
    seg.removeAttribute('data-placeholder')
    seg.setAttribute('aria-valuenow', String(numericValue))

    if (type === 'month') {
      const year = this._getSegmentValueByType('year') ?? new Date().getFullYear()
      seg.setAttribute('aria-valuetext', getMonthName(year, numericValue - 1, this.locale))
      seg.textContent = String(numericValue).padStart(2, '0')
      const daySeg = this._getSegmentEl('day')
      if (daySeg) {
        const daysInMonth = getDaysInMonth(year, numericValue - 1)
        daySeg.setAttribute('aria-valuemax', String(daysInMonth))
      }
    } else if (type === 'day') {
      seg.setAttribute('aria-valuetext', String(numericValue))
      seg.textContent = String(numericValue).padStart(2, '0')
      const limits = this._getSegmentLimits('day')
      seg.setAttribute('aria-valuemax', String(limits.max))
    } else {
      seg.setAttribute('aria-valuetext', String(numericValue))
      seg.textContent = String(numericValue)
    }
    this._trySyncToNative()
  }

  _clearSegment(seg: HTMLSpanElement): void {
    const type = seg.dataset.segment as SegmentType
    seg.setAttribute('data-placeholder', '')
    seg.removeAttribute('aria-valuenow')
    const placeholder = type === 'day' ? 'dd' : type === 'month' ? 'mm' : 'yyyy'
    seg.setAttribute('aria-valuetext', placeholder)
    seg.textContent = placeholder
  }

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

  _bindTrigger(): void {
    this.trigger.setAttribute('aria-label', this.t.openCalendar)
    if (this.native.disabled) {
      this.trigger.disabled = true
      return
    }
    this.trigger.addEventListener('click', this._handleTriggerClick)
  }

  // ─── Value sync ─────────────────────────────────────────────────────────────

  _trySyncToNative(): void {
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

  _bindValueSync(): void {
    this.native.addEventListener('change', this._handleNativeChange)
  }

  _bindFormReset(): void {
    this.native.form?.addEventListener('reset', this._handleFormReset)
  }

  _syncInitialValue(): void {
    if (!this.native.value) return
    const [y, m, d] = this.native.value.split('-').map(Number)
    this.selectedDate = new Date(y, m - 1, d)
    this._setSegmentValue(this._getSegmentEl('day')!, d)
    this._setSegmentValue(this._getSegmentEl('month')!, m)
    this._setSegmentValue(this._getSegmentEl('year')!, y)
  }

  // ─── Calendar lifecycle ──────────────────────────────────────────────────────

  _toggleCalendar(): void {
    this.calendarEl ? this._closeCalendar() : this._openCalendar()
  }

  _openCalendar(): void {
    if (!this.calendarTemplate) return

    const clone = this.calendarTemplate.content.cloneNode(true) as DocumentFragment
    this.calendarEl = clone.querySelector<HTMLElement>('.DateFieldCalendar')!

    const headingSpan = this.calendarEl.querySelector('.CalendarHeader span')
    const calId = `datefield-calendar-${this.instanceId}`
    const monthId = `datefield-month-${this.instanceId}`
    this.calendarEl.id = calId
    this.calendarEl.setAttribute('aria-labelledby', monthId)
    if (headingSpan) headingSpan.id = monthId

    const [prevBtn, nextBtn] = this.calendarEl.querySelectorAll<HTMLButtonElement>('.CalendarHeader button')
    prevBtn?.setAttribute('aria-label', this.t.prevMonth)
    nextBtn?.setAttribute('aria-label', this.t.nextMonth)
    prevBtn?.addEventListener('click', () => this._navigateMonth(-1))
    nextBtn?.addEventListener('click', () => this._navigateMonth(1))

    if (this.selectedDate) {
      this.currentYear = this.selectedDate.getFullYear()
      this.currentMonth = this.selectedDate.getMonth()
    } else {
      const today = new Date()
      this.currentYear = today.getFullYear()
      this.currentMonth = today.getMonth()
    }

    this._renderWeekdays()
    this._renderMonth()

    document.body.appendChild(this.calendarEl)

    const rect = this.trigger.getBoundingClientRect()
    this.calendarEl.style.top = `${rect.bottom + window.scrollY + 4}px`
    this.calendarEl.style.left = `${rect.left + window.scrollX}px`

    this.root.dataset.state = 'open'
    this.trigger.setAttribute('aria-expanded', 'true')
    this.trigger.setAttribute('aria-label', this.t.closeCalendar)

    this.calendarEl.addEventListener('keydown', e => this._handleCalendarKeydown(e))

    this._outsideClickHandler = (e: MouseEvent) => {
      if (!this.root.contains(e.target as Node) && !this.calendarEl?.contains(e.target as Node)) {
        this._closeCalendar()
      }
    }
    setTimeout(() => document.addEventListener('click', this._outsideClickHandler!), 0)

    this._moveFocusIntoCalendar()
  }

  _closeCalendar(): void {
    if (!this.calendarEl) return
    this.calendarEl.remove()
    this.calendarEl = null
    document.removeEventListener('click', this._outsideClickHandler!)
    this._outsideClickHandler = null

    this.root.dataset.state = 'idle'
    this.trigger.setAttribute('aria-expanded', 'false')
    this.trigger.setAttribute('aria-label', this.t.openCalendar)
    this.trigger.focus()
  }

  _navigateMonth(direction: number): void {
    this.currentMonth += direction
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++ }
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear-- }
    this._renderMonth()
  }

  _renderWeekdays(): void {
    const names = getWeekdayNames(this.locale)
    const ths = this.calendarEl!.querySelectorAll('.Grid thead th')
    ths.forEach((th, i) => {
      if (!names[i]) return
      th.textContent = names[i]
      const anchor = new Date(2024, 0, 1)
      anchor.setDate(anchor.getDate() + i)
      th.setAttribute('aria-label', new Intl.DateTimeFormat(this.locale, { weekday: 'long' }).format(anchor))
    })
  }

  _renderMonth(): void {
    const headingSpan = this.calendarEl!.querySelector('.CalendarHeader span')
    const monthName = getMonthName(this.currentYear, this.currentMonth, this.locale)
    if (headingSpan) headingSpan.textContent = `${monthName} ${this.currentYear}`

    const tbody = this.calendarEl!.querySelector<HTMLTableSectionElement>('.Grid tbody')!
    tbody.innerHTML = ''

    const today = new Date()
    const firstDay = getFirstWeekdayOfMonth(this.currentYear, this.currentMonth)
    const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth)

    const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear
    const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1
    const prevMonthDays = getDaysInMonth(prevYear, prevMonth)

    const nextYear = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear
    const nextMonth = this.currentMonth === 11 ? 0 : this.currentMonth + 1

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
    let dayCount = 1
    let nextMonthDay = 1
    let row = this._createRow()

    for (let i = 0; i < totalCells; i++) {
      if (i > 0 && i % 7 === 0) {
        tbody.appendChild(row)
        row = this._createRow()
      }

      let date: Date
      let isOutsideMonth = false
      if (i < firstDay) {
        date = new Date(prevYear, prevMonth, prevMonthDays - firstDay + i + 1)
        isOutsideMonth = true
      } else if (dayCount <= daysInMonth) {
        date = new Date(this.currentYear, this.currentMonth, dayCount++)
      } else {
        date = new Date(nextYear, nextMonth, nextMonthDay++)
        isOutsideMonth = true
      }

      row.appendChild(this._createCell(date, isOutsideMonth, today))
    }
    tbody.appendChild(row)

    this._updateRovingTabindex()
  }

  _createRow(): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.setAttribute('role', 'row')
    return tr
  }

  _createCell(date: Date, isOutsideMonth: boolean, today: Date): HTMLTableCellElement {
    const td = document.createElement('td')
    td.setAttribute('role', 'gridcell')

    const isToday = date.toDateString() === today.toDateString()
    const isSelected = this.selectedDate != null && date.toDateString() === this.selectedDate.toDateString()
    const isDisabled = isDayDisabled(date, this.min, this.max)

    if (isOutsideMonth) td.dataset.outsideMonth = ''
    if (isToday) td.dataset.today = ''
    if (isSelected) { td.dataset.selected = ''; td.setAttribute('aria-selected', 'true') }
    else td.setAttribute('aria-selected', 'false')
    if (isDisabled) { td.dataset.disabled = ''; td.setAttribute('aria-disabled', 'true') }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('tabindex', '-1')
    btn.dataset.date = formatISO(date)

    const dateLabel = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
    const suffixes = [
      isToday ? `, ${this.t.today}` : '',
      isSelected ? `, ${this.t.selected}` : '',
      isDisabled ? `, ${this.t.notAvailable}` : '',
    ].join('')
    btn.setAttribute('aria-label', `${dateLabel}${suffixes}`)
    btn.textContent = String(date.getDate())

    btn.addEventListener('click', () => {
      if (isDisabled) return
      if (isOutsideMonth) {
        this.currentYear = date.getFullYear()
        this.currentMonth = date.getMonth()
      }
      this._selectDate(date)
    })

    td.appendChild(btn)
    return td
  }

  _updateRovingTabindex(): void {
    const grid = this.calendarEl!.querySelector<HTMLElement>('.Grid')!
    grid.querySelectorAll('td button').forEach(b => b.setAttribute('tabindex', '-1'))

    const todayISO = formatISO(new Date())
    const todayBtn = grid.querySelector<HTMLButtonElement>(`button[data-date="${todayISO}"]`)
    const todayEnabled = todayBtn && !todayBtn.closest('[aria-disabled="true"]') ? todayBtn : null

    const target = grid.querySelector<HTMLButtonElement>('td[data-selected] button')
      ?? todayEnabled
      ?? grid.querySelector<HTMLButtonElement>('td:not([data-outside-month]):not([aria-disabled="true"]) button')
    if (target) target.setAttribute('tabindex', '0')
  }

  _moveFocusIntoCalendar(): void {
    const grid = this.calendarEl!.querySelector<HTMLElement>('.Grid')!
    const todayISO = formatISO(new Date())
    const todayBtn = grid.querySelector<HTMLButtonElement>(`button[data-date="${todayISO}"]`)
    const todayEnabled = todayBtn && !todayBtn.closest('[aria-disabled="true"]') ? todayBtn : null

    const target = grid.querySelector<HTMLButtonElement>('td[data-selected] button')
      ?? todayEnabled
      ?? grid.querySelector<HTMLButtonElement>('td:not([data-outside-month]):not([aria-disabled="true"]) button')
    target?.focus()
  }

  _selectDate(date: Date): void {
    this.selectedDate = date

    this._syncingFromCustom = true
    this.native.value = formatISO(date)
    this.native.dispatchEvent(new Event('change', { bubbles: true }))
    this._syncingFromCustom = false

    this._setSegmentValue(this._getSegmentEl('day')!, date.getDate())
    this._setSegmentValue(this._getSegmentEl('month')!, date.getMonth() + 1)
    this._setSegmentValue(this._getSegmentEl('year')!, date.getFullYear())

    const label = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
    this.announce.textContent = `${this.t.announceSelected} ${label}`

    this._closeCalendar()
  }

  // ─── Calendar keyboard ───────────────────────────────────────────────────────

  _handleCalendarKeydown(e: KeyboardEvent): void {
    const grid = this.calendarEl!.querySelector<HTMLElement>('.Grid')!
    const focusedBtn = grid.querySelector<HTMLButtonElement>('button:focus')

    if (e.key === 'Escape') {
      e.preventDefault()
      this._closeCalendar()
      return
    }

    if (e.key === 'Tab') {
      const [prevBtn, nextBtn] = this.calendarEl!.querySelectorAll<HTMLButtonElement>('.CalendarHeader button')
      const tabbable = [
        prevBtn,
        ...Array.from(grid.querySelectorAll<HTMLButtonElement>('td:not([aria-disabled="true"]) button')),
        nextBtn,
      ].filter((b): b is HTMLButtonElement => Boolean(b))

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
    const [fy, fm, fd] = currentISO.split('-').map(Number)
    let target = new Date(fy, fm - 1, fd)

    const arrowDelta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

    if (arrowDelta[e.key] !== undefined) {
      e.preventDefault()
      target.setDate(target.getDate() + arrowDelta[e.key])
      this._focusCalendarDate(target)
    } else if (e.ctrlKey && e.key === 'Home') {
      e.preventDefault()
      this._focusCalendarDate(new Date(this.currentYear, this.currentMonth, 1))
    } else if (e.ctrlKey && e.key === 'End') {
      e.preventDefault()
      this._focusCalendarDate(new Date(this.currentYear, this.currentMonth, getDaysInMonth(this.currentYear, this.currentMonth)))
    } else if (e.key === 'Home') {
      e.preventDefault()
      const dow = (target.getDay() + 6) % 7
      target.setDate(target.getDate() - dow)
      this._focusCalendarDate(target)
    } else if (e.key === 'End') {
      e.preventDefault()
      const dow = (target.getDay() + 6) % 7
      target.setDate(target.getDate() + (6 - dow))
      this._focusCalendarDate(target)
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      this._focusCalendarDate(new Date(fy, fm - 2, fd))
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      this._focusCalendarDate(new Date(fy, fm, fd))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const td = focusedBtn.closest('td')
      if (td && !td.hasAttribute('aria-disabled')) {
        this._selectDate(target)
      }
    }
  }

  _focusCalendarDate(date: Date): void {
    const iso = formatISO(date)
    let btn = this.calendarEl!.querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`)

    if (!btn) {
      this.currentYear = date.getFullYear()
      this.currentMonth = date.getMonth()
      this._renderMonth()
      btn = this.calendarEl!.querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`)
    }

    if (btn) {
      const grid = this.calendarEl!.querySelector<HTMLElement>('.Grid')!
      grid.querySelectorAll('td button').forEach(b => b.setAttribute('tabindex', '-1'))
      btn.setAttribute('tabindex', '0')
      btn.focus()
    }
  }
}

export default DateField
```

- [ ] **Step 3: Update the import in script.js**

In `src/js/script.js`, the first two lines currently import from `.js` files. Vite does not remap `.js` → `.ts` for explicit extensions, so update the DateField import to drop the extension:

```js
import DateField from "../partials/components/DateField/DateField"
import svSE from "../partials/components/DateField/locales/sv-SE.json"
```

(Only the first import changes. The `.json` import is unchanged.)

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0, no errors.

If there are errors, they will be TypeScript type errors to diagnose. Common causes: jsdom's `setTimeout` type vs DOM lib — if you see `Argument of type 'Timeout' is not assignable to parameter of type 'number'`, the fix is `clearTimeout(this._digitTimer as unknown as number ?? undefined)`. Do not proceed until typecheck is clean.

- [ ] **Step 5: Run unit tests**

```bash
npm run test:unit
```

Expected: all tests pass (same count as before the rename).

- [ ] **Step 6: Commit**

```bash
git add src/partials/components/DateField/DateField.ts src/js/script.js
git rm src/partials/components/DateField/DateField.js
git commit -m "feat(DateField): convert component to TypeScript with strict types"
```

---

## Task 3: Convert unit test to TypeScript

**Files:**
- Rename + rewrite: `tests/DateField.unit.test.js` → `tests/DateField.unit.test.ts`

- [ ] **Step 1: Delete the .js test file and create the .ts version**

Delete `tests/DateField.unit.test.js` and create `tests/DateField.unit.test.ts` with this content:

```ts
import { describe, it, expect, vi } from 'vitest'
import {
  getDaysInMonth,
  getFirstWeekdayOfMonth,
  getISOWeek,
  isDayDisabled,
  formatISO,
  getWeekdayNames,
  getMonthName,
  getSegmentOrder,
} from '../src/partials/components/DateField/DateField'
import DateField from '../src/partials/components/DateField/DateField'

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
  it('returns 6 for March 2026 (starts Sunday, Monday-first grid)', () => {
    expect(getFirstWeekdayOfMonth(2026, 2)).toBe(6)
  })
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
  it('starts with Monday for sv-SE (first char is m)', () => {
    const names = getWeekdayNames('sv-SE')
    expect(names[0].toLowerCase()).toMatch(/^m/)
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

describe('DateField.registerLocale', () => {
  it('registers and retrieves a locale', () => {
    DateField.registerLocale('test-locale', { day: 'Dag' })
    expect(DateField.translations['test-locale'].day).toBe('Dag')
  })
  it('overwrites an existing locale', () => {
    DateField.registerLocale('test-locale', { day: 'Day' })
    expect(DateField.translations['test-locale'].day).toBe('Day')
  })
})

describe('timezone safety', () => {
  it('new Date(y, m, d) produces correct local date — not UTC-shifted', () => {
    const d = new Date(2026, 2, 24)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2)
    expect(d.getDate()).toBe(24)
  })
})

describe('DateField locale resolution', () => {
  it('falls back to en when resolved locale has no registered translation', () => {
    const el = document.createElement('div')
    el.innerHTML = `
      <input class="Native" id="t1" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    el.dataset.component = 'DateField'
    el.dataset.locale = 'fr'
    document.body.appendChild(el)
    const instance = new DateField(el)
    expect(instance.locale).toBe('en')
    el.remove()
  })

  it('uses data-locale when set and registered', () => {
    const el = document.createElement('div')
    el.innerHTML = `
      <input class="Native" id="t2" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    el.dataset.component = 'DateField'
    el.dataset.locale = 'sv-SE'
    DateField.registerLocale('sv-SE', { day: 'Dag', month: 'Månad', year: 'År', openCalendar: 'Öppna kalender', closeCalendar: 'Stäng kalender', prevMonth: 'Föregående månad', nextMonth: 'Nästa månad', today: 'idag', selected: 'valt', notAvailable: 'ej tillgängligt', announceSelected: 'Valt datum:' })
    document.body.appendChild(el)
    const instance = new DateField(el)
    expect(instance.locale).toBe('sv-SE')
    expect(instance.t.day).toBe('Dag')
    el.remove()
  })

  it('falls back to document.documentElement.lang when data-locale is absent', () => {
    document.documentElement.lang = 'sv-SE'
    const el = document.createElement('div')
    el.innerHTML = `
      <input class="Native" id="t3" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    el.dataset.component = 'DateField'
    document.body.appendChild(el)
    const instance = new DateField(el)
    expect(instance.locale).toBe('sv-SE')
    document.documentElement.lang = ''
    el.remove()
  })
})

describe('registerLocale fallback', () => {
  it('falls back to en strings when locale is not registered', () => {
    const el = document.createElement('div')
    el.innerHTML = `
      <input class="Native" id="t4" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    el.dataset.component = 'DateField'
    el.dataset.locale = 'de'
    document.body.appendChild(el)
    const instance = new DateField(el)
    expect(instance.t.openCalendar).toBe('Open calendar')
    el.remove()
  })
})

// ─── Shared fixture helper ────────────────────────────────────────────────────

interface MakeFieldOptions {
  disabled?: boolean
  value?: string
  min?: string
  max?: string
  locale?: string
  id?: string
}

function makeField({ disabled = false, value = '', min = '', max = '', locale = 'sv-SE', id }: MakeFieldOptions = {}): { el: HTMLElement; instance: DateField } {
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

describe('DateField — initial value sync', () => {
  it('populates segments from native value attribute on mount', () => {
    const { el } = makeField({ value: '1990-06-15' })
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-valuenow')).toBe('15')
    expect(el.querySelector('[data-segment="month"]')!.getAttribute('aria-valuenow')).toBe('6')
    expect(el.querySelector('[data-segment="year"]')!.getAttribute('aria-valuenow')).toBe('1990')
    el.remove()
  })

  it('sets selectedDate from native value on mount', () => {
    const { el, instance } = makeField({ value: '1990-06-15' })
    expect(instance.selectedDate).not.toBeNull()
    expect(instance.selectedDate!.getFullYear()).toBe(1990)
    expect(instance.selectedDate!.getMonth()).toBe(5)
    expect(instance.selectedDate!.getDate()).toBe(15)
    el.remove()
  })

  it('leaves segments as placeholders when no initial value', () => {
    const { el } = makeField()
    expect(el.querySelector('[data-segment="day"]')!.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })

  it('populates segments from initial value even when field is disabled', () => {
    const { el } = makeField({ disabled: true, value: '1990-06-15' })
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-valuenow')).toBe('15')
    expect(el.querySelector('[data-segment="year"]')!.getAttribute('aria-valuenow')).toBe('1990')
    el.remove()
  })
})

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
    const daySeg = el.querySelector('[data-segment="day"]')!
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

describe('DateField — year digit input', () => {
  it('commits year value after 4 digits are typed', () => {
    const { el } = makeField()
    const yearSeg = el.querySelector('[data-segment="year"]')!
    for (const digit of ['2', '0', '2', '6']) {
      yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: digit, bubbles: true }))
    }
    expect(yearSeg.getAttribute('aria-valuenow')).toBe('2026')
    expect(yearSeg.hasAttribute('data-placeholder')).toBe(false)
    el.remove()
  })

  it('does not commit year after fewer than 4 digits', () => {
    const { el } = makeField()
    const yearSeg = el.querySelector('[data-segment="year"]')!
    for (const digit of ['2', '0', '2']) {
      yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: digit, bubbles: true }))
    }
    expect(yearSeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })
})

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
    const yearSeg = el.querySelector('[data-segment="year"]')!
    yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(yearSeg.getAttribute('aria-valuenow')).toBe('2026')
    el.remove()
  })

  it('ArrowUp on empty year defaults to 1900 when no data-min set', () => {
    const { el } = makeField()
    const yearSeg = el.querySelector('[data-segment="year"]')!
    yearSeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(yearSeg.getAttribute('aria-valuenow')).toBe('1900')
    el.remove()
  })
})

describe('DateField — min/max enforcement on segment sync', () => {
  it('does not write to native input when complete date is before data-min', () => {
    const { el, instance } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    const native = el.querySelector('.Native') as HTMLInputElement
    instance._setSegmentValue(instance._getSegmentEl('day')!, 1)
    instance._setSegmentValue(instance._getSegmentEl('month')!, 1)
    instance._setSegmentValue(instance._getSegmentEl('year')!, 2025)
    expect(native.value).toBe('')
    el.remove()
  })

  it('does not write to native input when complete date is after data-max', () => {
    const { el, instance } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    const native = el.querySelector('.Native') as HTMLInputElement
    instance._setSegmentValue(instance._getSegmentEl('day')!, 1)
    instance._setSegmentValue(instance._getSegmentEl('month')!, 1)
    instance._setSegmentValue(instance._getSegmentEl('year')!, 2028)
    expect(native.value).toBe('')
    el.remove()
  })

  it('writes to native input when complete date is within data-min/max', () => {
    const { el, instance } = makeField({ min: '2026-03-26', max: '2027-12-31' })
    const native = el.querySelector('.Native') as HTMLInputElement
    instance._setSegmentValue(instance._getSegmentEl('day')!, 1)
    instance._setSegmentValue(instance._getSegmentEl('month')!, 4)
    instance._setSegmentValue(instance._getSegmentEl('year')!, 2026)
    expect(native.value).toBe('2026-04-01')
    el.remove()
  })

  it('always writes when no data-min/max set', () => {
    const { el, instance } = makeField()
    const native = el.querySelector('.Native') as HTMLInputElement
    instance._setSegmentValue(instance._getSegmentEl('day')!, 1)
    instance._setSegmentValue(instance._getSegmentEl('month')!, 1)
    instance._setSegmentValue(instance._getSegmentEl('year')!, 1900)
    expect(native.value).toBe('1900-01-01')
    el.remove()
  })
})

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
    expect(segs[0].getAttribute('data-segment')).toBe('year')
    expect(segs[1].getAttribute('data-segment')).toBe('month')
    expect(segs[2].getAttribute('data-segment')).toBe('day')
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
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-label')).toBe('Dag')
    expect(el.querySelector('[data-segment="month"]')!.getAttribute('aria-label')).toBe('Månad')
    expect(el.querySelector('[data-segment="year"]')!.getAttribute('aria-label')).toBe('År')
    el.remove()
  })

  it('en segments have English aria-labels (Day, Month, Year)', () => {
    const { el } = makeField({ locale: 'en' })
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-label')).toBe('Day')
    expect(el.querySelector('[data-segment="month"]')!.getAttribute('aria-label')).toBe('Month')
    expect(el.querySelector('[data-segment="year"]')!.getAttribute('aria-label')).toBe('Year')
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

// ─── Display mode helpers ──────────────────────────────────────────────────

interface MakeDisplayFieldOptions {
  value?: string
  min?: string
  max?: string
  locale?: string
  disabled?: boolean
}

function makeDisplayField({ value = '', min = '', max = '', locale = 'sv-SE', disabled = false }: MakeDisplayFieldOptions = {}): { el: HTMLElement; instance: DateField } {
  vi.stubGlobal('matchMedia', (query: string) => ({
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
    expect(el.querySelector('.Custom')!.getAttribute('aria-hidden')).toBe('true')
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
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-valuenow')).toBe('15')
    expect(el.querySelector('[data-segment="month"]')!.getAttribute('aria-valuenow')).toBe('6')
    expect(el.querySelector('[data-segment="year"]')!.getAttribute('aria-valuenow')).toBe('1990')
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
    const native = el.querySelector('.Native') as HTMLInputElement
    native.value = '2026-12-31'
    native.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.querySelector('[data-segment="day"]')!.getAttribute('aria-valuenow')).toBe('31')
    expect(el.querySelector('[data-segment="month"]')!.getAttribute('aria-valuenow')).toBe('12')
    expect(el.querySelector('[data-segment="year"]')!.getAttribute('aria-valuenow')).toBe('2026')
    el.remove()
  })

  it('clears segments on form reset', () => {
    const form = document.createElement('form')
    document.body.appendChild(form)

    vi.stubGlobal('matchMedia', (query: string) => ({
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
    const daySeg = el.querySelector('[data-segment="day"]')!
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
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

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0, no errors.

- [ ] **Step 3: Run unit tests**

```bash
npm run test:unit
```

Expected: all tests pass, same count as before.

- [ ] **Step 4: Commit**

```bash
git add tests/DateField.unit.test.ts
git rm tests/DateField.unit.test.js
git commit -m "feat(DateField): convert unit tests to TypeScript"
```

---

## Self-Review Notes

**Type changes that are necessary (not logic changes):**
- `getISOWeek`: `(d - week1)` → `(d.getTime() - week1.getTime())` — TypeScript forbids arithmetic on `Date` objects directly.
- All `setAttribute` calls with number arguments → wrapped in `String()` — `setAttribute` signature requires `string`.
- `btn.textContent = date.getDate()` → `btn.textContent = String(date.getDate())` — `textContent` setter requires `string | null`.
- `isSelected` uses `this.selectedDate != null &&` to produce a `boolean` rather than `Date | null | false`.
- `clearTimeout(this._digitTimer)` → `clearTimeout(this._digitTimer ?? undefined)` — `clearTimeout` accepts `number | undefined`, not `number | null`.

**`!` non-null assertions used (all are honest):**
- DOM refs in constructor (`this.native`, `this.trigger`, etc.) — required elements in a controlled HTML structure.
- `this._getSegmentEl(type)!` in `_handleNativeChange`, `_syncInitialValue`, `_selectDate` — only called after `_buildSegments` has run.
- `this.calendarEl!` in calendar rendering methods — only called from within `_openCalendar` after `calendarEl` is set.
- `this._outsideClickHandler!` in `_closeCalendar` — handler is always set before this is called.
- `instance.selectedDate!` in tests — always guarded by the preceding `expect(...).not.toBeNull()`.
