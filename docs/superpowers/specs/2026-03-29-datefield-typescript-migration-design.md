# DateField TypeScript Migration — Design

**Date:** 2026-03-29
**Scope:** `DateField.ts` + `DateField.unit.test.ts` only. Other components remain `.js`.

---

## Goal

Convert the DateField component and its unit tests to TypeScript with `strict: true`. The project is a reference boilerplate — the types serve as machine-readable contracts for anyone porting this component to a framework or Web Component. No logic changes.

---

## Tooling Setup

Install `typescript` as a devDependency. Add `tsconfig.json` at the project root:

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

- `noEmit: true` — Vite handles transpilation; TypeScript is type-check only.
- `moduleResolution: "bundler"` — Vite-optimised; no `.js` extension required on imports.
- Add `"typecheck": "tsc --noEmit"` to `package.json` scripts.
- Update `vitest.config.js` exclude pattern to also cover `*.e2e.test.ts`.

---

## Core Types

Defined at the top of `DateField.ts`:

```ts
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
```

### DOM augmentation

Module augmentation extends the DOM interfaces for properties attached at runtime:

```ts
declare global {
  interface HTMLElement {
    __dateFieldInstance?: DateField
  }
  interface HTMLSpanElement {
    __dateFieldHandlers?: SegmentHandlers
  }
}
```

This replaces type assertions/`any` and documents the implicit DOM contract explicitly.

---

## Class Instance Properties

```ts
class DateField {
  static instanceCount: number
  static translations: Record<string, TranslationStrings>

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
}
```

`ReturnType<typeof setTimeout>` is the correct cross-environment type for timer IDs (browser and Node/jsdom).

---

## Exported Helper Signatures

```ts
export function getDaysInMonth(year: number, month: number): number
export function getFirstWeekdayOfMonth(year: number, month: number): number
export function getISOWeek(date: Date): number
export function isDayDisabled(date: Date, min: Date | null, max: Date | null): boolean
export function formatISO(date: Date): string
export function getWeekdayNames(locale: string): string[]
export function getMonthName(year: number, month: number, locale: string): string
export function getSegmentOrder(locale: string): { order: SegmentType[]; separator: string }
```

`getSegmentOrder` return type narrows `order` from `string[]` to `SegmentType[]` — callers know they receive only `'day' | 'month' | 'year'` values.

## Private Method Return Types

- `_resolveLocale(): string`
- `_parseDate(isoString: string): Date`
- `_getSegmentEl(type: SegmentType): HTMLSpanElement | null`
- `_getSegmentValueByType(type: SegmentType): number | null`
- `_getCurrentSegmentValue(seg: HTMLSpanElement): number | null`
- `_getSegmentLimits(type: SegmentType): { min: number; max: number }`
- `_createSegmentEl(type: SegmentType): HTMLSpanElement`
- `_createRow(): HTMLTableRowElement`
- `_createCell(date: Date, isOutsideMonth: boolean, today: Date): HTMLTableCellElement`
- All other private methods: `void`

---

## Test File Migration

Rename `DateField.unit.test.js` → `DateField.unit.test.ts`. Import path changes from `.js` to `.ts` extension (or no extension — bundler resolution handles it).

Helper types:

```ts
interface MakeFieldOptions {
  disabled?: boolean
  value?: string
  min?: string
  max?: string
  locale?: string
  id?: string
}
```

`makeField` return type: `{ el: HTMLElement; instance: DateField }`.
`makeDisplayField` uses the same options interface minus `id`.

### Null assertion in tests

`selectedDate` is typed `Date | null`. Tests that access it after `expect(instance.selectedDate).not.toBeNull()` use a non-null assertion:

```ts
expect(instance.selectedDate!.getFullYear()).toBe(1990)
```

TypeScript cannot narrow through Vitest's `expect` — the assertion is honest because the preceding `expect` line has already established non-null.

---

## Out of Scope

- `DateField.e2e.test.js` — stays `.js` for now (Playwright has its own type setup).
- All other components — separate sessions.
- No logic changes of any kind.
