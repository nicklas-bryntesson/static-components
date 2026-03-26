# DateField — Design Spec

**Version:** 1.4
**Date:** 2026-03-25
**Scope:** Single date picker, v1

---

## 1. Purpose & Goals

DateField is a tech-agnostic date input component. The goal is to define — precisely — what a correct implementation must achieve in terms of accessibility, functionality, and progressive enhancement. The HTML/CSS/JS reference implementation serves as a working facit for ports to React, Vue, Svelte, or Web Components.

**Non-goals (v1):**
- Date range selection
- Disabled date sets beyond min/max (no specific dates, weekday rules, or ranges)
- Full media player-style controls

**Guiding principles:** ethics, empathy, and accessibility first. WCAG 2.2 AA is the minimum bar, not a stretch goal.

---

## 2. Component Contract

### 2.1 Core invariant

One hidden `input[type="date"]` owns the value at all times in `yyyy-mm-dd` format. The custom UI writes to it. The native input posts with the form. Nothing writes to the native input except the custom UI and browser autofill.

### 2.2 Progressive enhancement

Without JS: the native input is visible and functional. No custom UI is rendered. This is the baseline — always safe, never broken.

With JS on `pointer: fine`: JS sets `data-input-mode="custom"` on the root. CSS reveals the custom UI and hides the native input.

With JS on `pointer: coarse`: JS sets `data-input-mode="native"` on the root. CSS keeps the native input visible. The native OS date picker (iOS drum-scroll, Android clock face) is used as-is — it is genuinely good on touch.

**Pointer detection is one-shot:** pointer mode is detected once at initialization and does not respond to device mode changes (e.g. connecting a keyboard to an iPad). This is an intentional v1 product decision — implementing a responsive listener adds complexity for a rare edge case.

### 2.3 Data-attribute contract — root element

| Attribute | Values | Set by | Purpose |
|---|---|---|---|
| `data-component` | `"DateField"` | Markup / server | JS attach hook |
| `data-input-mode` | `native \| custom` | JS | CSS gate — shows/hides UI branches |
| `data-state` | `idle \| open` | JS | JS-internal signal; no built-in CSS gate. Available for integrators who want to style the trigger or field wrapper when the calendar is open. |
| `data-locale` | e.g. `"sv-SE"` | Server (optional) | Locale for month/weekday names |
| `data-min` | `yyyy-mm-dd` | Server (optional) | Minimum selectable date |
| `data-max` | `yyyy-mm-dd` | Server (optional) | Maximum selectable date |

### 2.4 i18n contract

Generic UI strings (segment labels, calendar button labels, state suffixes) live in **per-locale translation files**, not in markup. `data-*` attributes are reserved for data that is instance-specific or that changes at runtime based on user interaction.

#### Registration API

```js
DateField.registerLocale('sv-SE', {
  day:              'Dag',
  month:            'Månad',
  year:             'År',
  openCalendar:     'Öppna kalender',
  closeCalendar:    'Stäng kalender',
  prevMonth:        'Föregående månad',
  nextMonth:        'Nästa månad',
  today:            'idag',
  selected:         'valt',
  notAvailable:     'ej tillgängligt',
  announceSelected: 'Valt datum:',
})
```

`registerLocale` is a static method. It must be called before `DateField.attach()`. The component ships with `en` registered by default — no setup required for English. Calling `registerLocale` for a locale the component already knows overwrites it.

**Locale resolution at runtime** (unchanged from 2.7):
`data-locale` → `document.documentElement.lang` → `"en"`

If the resolved locale has no registered translations, the component falls back to `"en"`.

#### JSON source format

The JSON file per locale is the canonical source. How it reaches the browser (static import, dynamic import, inline script) is the app's responsibility.

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

#### Field label

The field label ("Födelsedatum", "Departure date", etc.) is instance-specific — it is not a generic locale string. It comes from the associated `<label>` element in HTML, not from a data-attr. JS detects the label by following standard form semantics:

```js
// During init, in custom mode:
const labelEl = root.querySelector('.Native')?.id
  ? document.querySelector(`label[for="${root.querySelector('.Native').id}"]`)
  : null;

if (labelEl) {
  if (!labelEl.id) labelEl.id = `datefield-label-${this.instanceId}`;
  segments.setAttribute('aria-labelledby', labelEl.id);
}
```

If no associated `<label>` is found, JS falls back to `data-label-field` on the root. If neither exists, the `.Segments` group has no label — which is an authoring error, not a component error.

### 2.5 Data-attribute contract — segment elements

| Attribute | Description |
|---|---|
| `data-segment` | `day \| month \| year` |
| `data-placeholder` | Present when segment has no value |
| `data-focused` | Set by JS on the active segment |

### 2.6 Data-attribute contract — calendar day cells

`data-*` attributes live on the `<td role="gridcell">` element, not on the inner `<button>`. CSS gates respond to `<td>`. `aria-selected` and `aria-disabled` also live on `<td>` per ARIA 1.2.

| Attribute | Description |
|---|---|
| `data-today` | Today's date |
| `data-selected` | The currently selected date |
| `data-disabled` | Outside min/max range — not selectable |
| `data-outside-month` | Day from an adjacent month |

CSS is strictly reactive to all of the above. No property enters the cascade unless its gate attribute is present.

### 2.7 Locale resolution

Locale is resolved in this order:

1. `data-locale` on the root element (explicit, server-set)
2. `document.documentElement.lang` (the page's canonical locale)
3. `"en"` hardcoded fallback

`navigator.language` is intentionally not used — it reflects the user's browser preference, not the page's language. A French visitor on a Swedish site should see Swedish month names.

### 2.8 Instance uniqueness

Multiple `DateField` instances on the same page require unique IDs for `aria-labelledby` references. JS maintains a static instance counter, identical to the pattern in `CoverCompositionVideo`:

```js
static instanceCount = 0;
// In constructor:
DateField.instanceCount += 1;
this.instanceId = DateField.instanceCount;
// IDs become: datefield-month-1, datefield-month-2, etc.
```

---

## 3. HTML Structure

The field label is provided by a standard `<label>` element — the same way any native form control is labeled. No translation strings appear in markup.

```html
<!-- Label is external — JS connects it to .Segments via aria-labelledby -->
<label for="birthdate">Födelsedatum</label>

<div
  class="DateField"
  data-component="DateField"
  data-locale="sv-SE"
  data-min="1900-01-01"
  data-max="2100-12-31"
>
  <!-- Source of truth — always in DOM, posts with form -->
  <input
    class="Native"
    id="birthdate"
    type="date"
    name="birthdate"
    min="1900-01-01"
    max="2100-12-31"
  />

  <!-- Custom UI — hidden by default.
       JS removes aria-hidden and sets data-input-mode="custom" on root during init.
       CSS never touches aria-hidden — that is exclusively JS's responsibility. -->
  <div class="Custom" aria-hidden="true">

    <!-- aria-label set by JS from data-label-field.
         No aria-labelledby needed — no external element dependency. -->
    <div class="Segments" role="group">

      <!-- When data-placeholder is present:
           - aria-valuenow attribute is absent (removed by JS)
           - aria-valuetext is set to the placeholder string (e.g. "dd")
           When value is set:
           - aria-valuenow is present with the numeric value
           - aria-valuetext is the localized string (e.g. "24" for day, "mars" for month) -->
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
        aria-valuetext="åååå"
        tabindex="-1"
        data-segment="year"
        data-placeholder
      >åååå</span>

      <!-- No aria-controls — the calendar element only exists in the DOM when
           open (teleported to body). aria-controls pointing to a non-existent
           id is an ARIA authoring error and will fail axe-core.
           aria-expanded + aria-haspopup="dialog" are sufficient per APG. -->
      <button
        type="button"
        class="Trigger"
        aria-label="Öppna kalender"
        aria-expanded="false"
        aria-haspopup="dialog"
      ><!-- SVG calendar icon --></button>

    </div>

    <!-- Calendar template. JS locates this via data-template="datefield-calendar".
         On open: JS clones this template content, appends clone to <body>,
         and positions it relative to the trigger button.
         On close: JS removes the clone from <body>.
         The <template> element itself is never moved. -->
    <template data-template="datefield-calendar">
      <div
        class="DateFieldCalendar"
        role="dialog"
        aria-modal="true"
      >
        <!-- id and aria-labelledby set by JS using instance counter -->
        <!-- e.g. id="datefield-calendar-1" aria-labelledby="datefield-month-1" -->

        <div class="CalendarHeader">
          <!-- aria-label set by JS from translations.prevMonth -->
          <button type="button">&#8249;</button>

          <!-- id set by JS using instance counter, e.g. id="datefield-month-1" -->
          <span aria-live="polite" aria-atomic="true">Mars 2026</span>

          <!-- aria-label set by JS from translations.nextMonth -->
          <button type="button">&#8250;</button>
        </div>

        <table class="Grid" role="grid">
          <!-- aria-labelledby set by JS to match CalendarHeader span id -->
          <thead>
            <tr role="row">
              <!-- aria-label on <th> provides a reliable full name for SR
                   across all SR/browser combinations. Visual text remains short.
                   Using aria-label instead of <abbr title="..."> because
                   abbr title behavior is inconsistent across SR/browser pairs —
                   some read text content, some read title. aria-label is reliable. -->
              <th scope="col" aria-label="Måndag">Mån</th>
              <th scope="col" aria-label="Tisdag">Tis</th>
              <th scope="col" aria-label="Onsdag">Ons</th>
              <th scope="col" aria-label="Torsdag">Tor</th>
              <th scope="col" aria-label="Fredag">Fre</th>
              <th scope="col" aria-label="Lördag">Lör</th>
              <th scope="col" aria-label="Söndag">Sön</th>
            </tr>
          </thead>
          <tbody>
            <!--
              Generated by JS. Key structural rules per cell:

              - aria-selected lives on <td role="gridcell"> (ARIA 1.2)
              - aria-disabled lives on <td role="gridcell"> for disabled cells
              - data-* attributes live on <td> — CSS gates respond there
              - tabindex lives on <button> — roving tabindex target
              - aria-label on <button> contains the full date string + state suffixes

              Example of a normal day:
              <td role="gridcell" aria-selected="false" data-date="2026-03-24">
                <button type="button" tabindex="-1" aria-label="24 mars 2026">24</button>
              </td>

              Example of today + selected:
              <td role="gridcell" aria-selected="true" data-date="2026-03-25" data-today data-selected>
                <button type="button" tabindex="0" aria-label="25 mars 2026, idag, valt">25</button>
              </td>

              Example of a disabled day:
              <td role="gridcell" aria-selected="false" aria-disabled="true"
                  data-date="2026-01-01" data-disabled>
                <button type="button" tabindex="-1" aria-label="1 januari 2026, ej tillgängligt">1</button>
              </td>
            -->
          </tbody>
        </table>
      </div>
    </template>

  </div>

  <!-- Live region — announces selected date to screen readers.
       Must NOT carry the hidden attribute or display:none — those remove
       elements from the accessibility tree and a live region not in the
       a11y tree cannot announce anything.
       This element stays inside .DateField root at all times — it never
       teleports with the calendar. -->
  <div class="Announce" aria-live="polite" aria-atomic="true"></div>

</div>
```

**Key structural rules:**

- `aria-hidden="true"` on `.Custom` is removed by JS during initialization — CSS never touches it
- `.Segments` receives `aria-labelledby` pointing to the associated `<label>` element (connected by JS during init); falls back to `aria-label` from `data-label-field` on root if no `<label for>` is found
- No `aria-controls` on trigger — the calendar only exists in DOM when open; a stale `aria-controls` reference to a non-existent ID is an ARIA error that axe-core will flag
- `.Announce` is visually hidden via CSS clip pattern and stays inside `.DateField` root always — it never teleports
- Calendar is a `<template>` element; JS clones it to `<body>` on open and removes it on close — `aria-modal` works correctly in VoiceOver/Safari only when the dialog is a body child
- `aria-selected` and `aria-disabled` live on `<td role="gridcell">` — ARIA 1.2 defines these as supported states on `gridcell`
- `data-*` attributes live on `<td>` — CSS gates respond to them there
- Weekday headers use `aria-label` on `<th>` — reliable across all SR/browser combinations; `<abbr title="...">` is not used because `abbr title` behavior is inconsistent across SR/browser pairs
- Day button `aria-label` contains the full date string + state suffixes; `<td>` carries the semantic state attributes

---

## 4. CSS Architecture

CSS is purely reactive. Every conditional property lives behind a `data-*` gate. No base-level defaults that get overridden. No property appears in DevTools unless its gate is active.

System color keywords (`Canvas`, `HighlightText`, `GrayText`) are used throughout to ensure correct behavior in forced colors / high contrast mode without requiring `@media forced-colors` overrides.

```css
/*
DateField input modes:
- [default / no JS]: Native input visible, Custom hidden
- [data-input-mode="custom"]: Custom UI visible, Native hidden
- [data-input-mode="native"]: Native visible (explicit, coarse-pointer)

Calendar:
- Managed as a body-level element by JS — CSS lives in .DateFieldCalendar
- .DateField has no CSS gate for calendar visibility
*/

.DateField {
  position: relative;
  display: inline-block;

  /* Native visible by default — safe no-JS state */
  & .Native {
    display: block;
  }

  /* Custom hidden by default */
  & .Custom {
    display: none;
  }

  /* ===== INPUT MODE GATE ===== */

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

  /* ===== SEGMENTS ===== */

  & .Segments {
    display: inline-flex;
    align-items: center;
    border: 1px solid;
    padding-inline: 0.5rem;
    padding-block: 0.25rem;
    gap: 0.125rem;
  }

  & .Segment {
    font-variant-numeric: tabular-nums;
    min-inline-size: 2ch;
    text-align: center;
    outline: none;
    border-radius: 2px;

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
  }

  & .Trigger {
    margin-inline-start: 0.25rem;
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    border-radius: 2px;

    &:focus-visible {
      outline: 2px solid;
      outline-offset: 2px;
    }
  }

  /* ===== LIVE REGION — visually hidden, never display:none ===== */

  & .Announce {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}

/* ===== CALENDAR — top-level class, body child at runtime ===== */

.DateFieldCalendar {
  position: fixed;
  background: Canvas;
  border: 1px solid;
  padding: 0.75rem;
  z-index: 10;
  /* Position (top/left) is set by JS using trigger getBoundingClientRect() */

  & .CalendarHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-block-end: 0.5rem;

    & button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;

      &:focus-visible {
        outline: 2px solid;
        outline-offset: 2px;
      }
    }
  }

  & .Grid {
    border-collapse: collapse;

    & th {
      font-size: 0.75em;
      padding-block-end: 0.25rem;
      text-align: center;
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

      &:focus-visible {
        outline: 2px solid;
        outline-offset: 2px;
      }
    }

    /* ===== STATE GATES ON <td role="gridcell"> ===== */

    & td[data-today] button {
      /* Non-color indicator required — color alone fails WCAG 1.4.1 */
      font-weight: bold;
      text-decoration: underline;
    }

    & td[data-selected] button {
      background-color: Highlight;
      color: HighlightText;
    }

    & td[data-disabled] button {
      --_disabledColor: #767676; /* 4.54:1 against Canvas — WCAG AA */
      color: var(--_disabledColor);
      cursor: not-allowed;
      /* aria-disabled="true" on <td> provides the semantic signal.
         Color + cursor provides the visual signal.
         No additional non-color indicator is specified — aria-disabled
         covers the accessibility requirement. */
    }

    & td[data-outside-month] button {
      color: GrayText;
    }
  }
}
```

**Key CSS rules:**

- `.Announce` uses the clip/overflow visually-hidden pattern — never `display: none` or `hidden`
- `.DateFieldCalendar` is a top-level class — the calendar is a body child at runtime, so it cannot be scoped inside `.DateField`
- State gates live on `<td>` (`td[data-today]`, `td[data-selected]`, etc.) — consistent with where `data-*` attributes are placed in the HTML contract
- `data-disabled` uses explicit color (`#767676`), never `opacity`
- `:focus-visible` throughout, never `:focus`
- JS owns the calendar's position coordinates via `style.top`/`style.left` from `getBoundingClientRect()`

---

## 5. JS Contract

### 5.1 Class API

Follows the same attach and cleanup pattern as `CoverCompositionVideo`:

```js
class DateField {
  static instanceCount = 0;
  static translations = { en: { /* built-in English strings */ } };

  static registerLocale(locale, strings) {
    /* Merge strings into DateField.translations[locale].
       Overwrites existing entry if locale already registered.
       Must be called before DateField.attach(). */
  }

  static attach(parent = document) { /* scan and instantiate */ }
  constructor(el) { /* init */ }
  destroy() {
    /* Remove all event listeners
       Remove calendar element from <body> if present
       Restore aria-hidden on .Custom
       Delete instance reference from root element
       (delete this.root.__dateFieldInstance) */
  }
}
```

### 5.2 Initialization sequence

1. Detect pointer type via `window.matchMedia("(pointer: coarse)")`
2. Set `data-input-mode` on root
3. Increment `DateField.instanceCount`, store as `this.instanceId`
4. If `custom`:
   - Remove `aria-hidden` from `.Custom` (JS owns this, CSS never touches it)
   - Resolve locale: `data-locale` → `document.documentElement.lang` → `"en"`
   - Load translation strings: `DateField.translations[locale]` → fall back to `"en"`
   - Connect field label: find `label[for="${nativeInput.id}"]`, set `aria-labelledby` on `.Segments`. Fall back to `aria-label` from `data-label-field` on root if no `<label>` found. (`data-label-field` is instance-specific and is the only `data-label-*` that remains in markup — it is not a generic UI string.)
   - Set up segment interaction (ARIA attrs, keyboard handlers)
   - Set up calendar lifecycle (template cloning, teleport, positioning, outside-click)
   - Set up value sync listeners
   - Store instance reference: `this.root.__dateFieldInstance = this`
5. If `native`: no further setup needed

### 5.3 State machine

```
idle  ──[OPEN]──▶  open
open  ──[CLOSE]──▶ idle
open  ──[SELECT]──▶ idle
```

JS sets `data-state="open"` / `data-state="idle"` on root. The calendar element is appended to `<body>` on open and removed on close.

### 5.4 Segment keyboard contract

Implemented for keyboard-only users. Screen reader users navigate via their own commands against the semantic markup — see section 6.

| Key | Behavior |
|---|---|
| `ArrowUp` | Increment segment, wrap at max |
| `ArrowDown` | Decrement segment, wrap at min |
| `ArrowLeft` | Move focus to previous segment |
| `ArrowRight` | Move focus to next segment |
| `0–9` | Digit entry — see auto-advance rules below |
| `Backspace` | Clear segment, move focus to previous segment |
| `Escape` | Close calendar if open |

**Auto-advance rules:**
- Day: first digit > 3 → advance immediately to month. First digit ≤ 3 → wait up to 1 second for a second digit, then commit and advance.
- Month: first digit > 1 → advance immediately to year. First digit = 1 → wait up to 1 second for a second digit, then commit and advance.
- Year: advance after 4 digits. No timeout.

The 1-second timeout covers ambiguous first digits (e.g. day=`3` which could be `3`, `30`, or `31`). After timeout, the current single digit is committed and focus advances.

**Roving tabindex:** Only one segment holds `tabindex="0"` at a time. `ArrowLeft`/`ArrowRight` moves it. `Tab` exits the segment group naturally.

**ARIA updates on each segment change:**
- When value is set: add `aria-valuenow` (numeric) and update `aria-valuetext` (localized, e.g. `"mars"` for month)
- When segment is cleared: remove `aria-valuenow`, set `aria-valuetext` to the placeholder string (e.g. `"dd"`, `"mm"`, `"åååå"`)
- `data-placeholder` — removed when value is set, added when cleared
- `aria-valuemax` on day segment must be updated when month or year changes (February = 28/29 days, April/June/September/November = 30 days)

### 5.5 Calendar behavior contract

**Template and teleport:**
JS locates the calendar template via `root.querySelector('[data-template="datefield-calendar"]')`. On open, JS clones the template content, sets all dynamic IDs and labels, appends the clone to `<body>`, and positions it. On close, JS removes the clone from `<body>`. The `<template>` element itself never moves.

**Opening:**
1. Clone template content. On the cloned dialog element set:
   - `id="datefield-calendar-{instanceId}"`
   - `aria-labelledby="datefield-month-{instanceId}"`
   On the `CalendarHeader` span set:
   - `id="datefield-month-{instanceId}"`
   Set all button `aria-label` values from the cached label strings.
2. Render current month days into calendar grid
3. Append calendar to `<body>`
4. Position calendar relative to trigger: `triggerRect = trigger.getBoundingClientRect()`
5. Set `data-state="open"` on root
6. Update trigger: `aria-expanded="true"`, `aria-label` → `translations.closeCalendar`
7. Move focus to: selected date button → today button → first non-disabled day button

**Closing (Escape, outside click, or date selected):**
1. Remove calendar clone from `<body>`
2. Set `data-state="idle"` on root
3. Update trigger: `aria-expanded="false"`, `aria-label` → `translations.openCalendar`
4. Return focus to trigger button

**Outside-click detection:**
Because the calendar is a body-level element (not a descendant of `.DateField`), the outside-click handler must check against both:
```js
if (!root.contains(e.target) && !calendarEl.contains(e.target)) {
  close();
}
```
A check against only `root` would close the calendar on every click within it.

**Focus trap — complete specification:**
Focusable elements in the calendar: prev-month button, next-month button, and the day buttons.

**Two traversal modes — these are distinct and must not be conflated:**
1. **Arrow-key navigation (grid):** All day buttons participate, including disabled ones. Disabled day buttons are focusable so SR users can discover and read their label.
2. **Tab-wrap cycle:** Collects only non-disabled day buttons (excluding `<td[aria-disabled="true"]> button>`) plus prev-month and next-month buttons. The disabled day buttons must not participate in Tab order.

Tab-wrap implementation:
```js
// Collect Tab-eligible elements (excludes disabled day buttons).
// Uses aria-disabled (not data-disabled) because aria-disabled is the
// canonical ARIA state attribute on <td role="gridcell"> — data-disabled
// is the CSS hook. Selecting against the ARIA state avoids accidental
// inclusion of disabled cells if data-disabled is temporarily absent.
const tabbable = [
  prevButton,
  ...Array.from(grid.querySelectorAll('td:not([aria-disabled="true"]) button')),
  nextButton
].filter(el => !el.hidden);

// On keydown Tab within calendar:
if (e.key === 'Tab') {
  const first = tabbable[0];
  const last = tabbable[tabbable.length - 1];
  if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  }
}
```

**Month navigation:**
Update the CalendarHeader span text. `aria-live="polite"` on the heading announces the new month to SR automatically.

**Day keyboard navigation — grid scope only** (for keyboard-only users, aligned with ARIA APG):

These keys are captured only when focus is on a day button inside `.Grid`. When focus is on the prev/next month buttons, only the standard button keyboard behavior applies.

| Key | Behavior |
|---|---|
| `ArrowLeft` / `ArrowRight` | Previous / next day |
| `ArrowUp` / `ArrowDown` | Same weekday, previous / next week |
| `PageUp` / `PageDown` | Same day, previous / next month |
| `Home` | First day of the current week row |
| `End` | Last day of the current week row |
| `Ctrl+Home` | First non-disabled day of the current month |
| `Ctrl+End` | Last non-disabled day of the current month |
| `Enter` / `Space` | Select date |
| `Escape` | Close calendar |

`Home`/`End` navigate within the current week row (Monday–Sunday). `Ctrl+Home`/`Ctrl+End` move to month boundaries, consistent with the ARIA APG Date Picker Dialog pattern.

When arrow-key navigation crosses a month boundary (e.g. `ArrowLeft` from the 1st), the calendar navigates to the adjacent month and focuses the appropriate day.

**Roving tabindex in grid:** One day button holds `tabindex="0"` at a time. All others hold `tabindex="-1"`. Focus moves to the button inside the target `<td>`.

**`data-disabled` interaction contract:**
- Disabled cells are focusable via arrow-key navigation (SR must discover them)
- Clicks and `Enter`/`Space` on disabled cells are ignored — event handler returns early
- `aria-disabled="true"` is set on `<td role="gridcell">` for disabled cells
- `disabled` attribute is never used on day buttons

**Outside-month day interaction contract:**
Clicking or activating a day with `data-outside-month` navigates the calendar to that month and selects the date. Outside-month days are not disabled unless they fall outside the min/max range.

**Day `aria-label` format (on `<button>`):**

Full label built by concatenating applicable suffixes in this fixed order:

1. Full date string: `"24 mars 2026"`
2. If today: `, idag` (from `translations.today`)
3. If selected: `, valt` (from `translations.selected`)
4. If disabled: `, ej tillgängligt` (from `translations.notAvailable`)

Outside-month days have no special label suffix — their date string already places them in a different month. A day that is today + selected → `"24 mars 2026, idag, valt"`.

### 5.6 Value sync contract

```
Segment input   ──▶  syncToNative()   ──▶  native.value = "yyyy-mm-dd"
                                       ──▶  dispatch "change" (bubbles: true)
                                       ──▶  announce via .Announce: "Valt datum: 24 mars 2026"

native "change" (autofill)   ──▶  syncFromNative()   ──▶  update segment display
form "reset"                 ──▶  clearSegments()    ──▶  restore all segments to placeholder
                                                      ──▶  no live region announcement on reset
```

Live region announcement fires only on intentional date selection. Form reset does not announce — it is a user-initiated bulk action.

**Timezone rule (critical):**
Always construct dates as `new Date(year, month, day)` — never `new Date("yyyy-mm-dd")`.
ISO string parsing treats the string as UTC midnight and will produce the wrong local date in negative-offset timezones.

### 5.7 Locale rendering

```js
getLocale()           // data-locale → document.documentElement.lang → "en"
getMonthName(y, m)    // Intl.DateTimeFormat, e.g. "mars" for sv-SE
getWeekdayNames()     // Intl.DateTimeFormat — always returns 7-element array
                      // starting from Monday regardless of locale.
                      // Locale affects names (e.g. "Mån" vs "Mon"),
                      // not start day. Calendar always starts on Monday.
                      // This is an intentional product decision.
```

---

## 6. Accessibility Requirements

### 6.1 Screen reader philosophy

The keyboard shortcuts in sections 5.4 and 5.5 are implemented **for keyboard-only users**, not for screen reader users. VoiceOver (macOS) uses `VO + arrow keys` to navigate; NVDA and JAWS use their own command sets. The component must not assume or document that SR users press specific keys.

Correct SR support is achieved through:
- Correct semantic HTML elements
- Correct ARIA roles, properties, and states kept in sync with actual UI state
- Real focus management (roving tabindex — not `aria-activedescendant`)
- Live regions announcing dynamic content

### 6.2 WCAG 2.2 AA checklist

- [ ] All interactive elements are keyboard reachable
- [ ] Focus order follows DOM order — `tabindex > 0` is never used
- [ ] Focus is always visible via `:focus-visible` outline
- [ ] Focus outline visible against all backgrounds (min 3:1 contrast — WCAG 2.2 2.4.11)
- [ ] `.Segments` has `aria-labelledby` pointing to associated `<label>` element (or `aria-label` from `data-label-field` as fallback)
- [ ] `aria-label` on every segment reflects current value and role
- [ ] `aria-valuenow` absent when segment is in placeholder state
- [ ] `aria-valuemax` on day segment kept in sync with selected month/year
- [ ] `aria-expanded` on trigger reflects calendar open/closed state
- [ ] No `aria-controls` on trigger — avoids stale ID reference when calendar is closed
- [ ] `aria-live` regions announce: month navigation (via heading), selected date (via `.Announce`)
- [ ] `.Announce` is visually hidden via CSS clip pattern, never `hidden` or `display: none`
- [ ] `.Announce` stays inside `.DateField` root — never teleports
- [ ] Calendar is appended to `<body>` on open — `aria-modal` works in VoiceOver/Safari
- [ ] `aria-selected` lives on `<td role="gridcell">` (ARIA 1.2)
- [ ] `aria-disabled="true"` on `<td>` for disabled cells — `disabled` attribute never used
- [ ] Disabled day buttons are focusable via arrow-key navigation (SR discovery)
- [ ] Disabled day buttons excluded from Tab-wrap cycle
- [ ] Disabled day color achieves 4.5:1 contrast (explicit color, not opacity)
- [ ] No color-only state communication — `data-today` uses bold + underline
- [ ] Component works in forced colors / high contrast (system color keywords)
- [ ] Weekday headers use `aria-label` on `<th>` — not `<abbr title>` (unreliable across SR/browser)
- [ ] All visible text meets 4.5:1 contrast (normal) or 3:1 (large text)
- [ ] Multiple instances on same page have unique IDs (instance counter pattern)

---

## 7. Test Matrix

### 7.1 Testing stack

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Pure JS logic — date math, locale helpers, constraints |
| Integration + a11y | Playwright + axe-core | DOM interaction, keyboard flows, automated WCAG checks |
| Screen reader | Manual | VoiceOver, NVDA — cannot be reliably automated |

### 7.2 Automated test scenarios

| Scenario | Layer |
|---|---|
| JS disabled — native input visible | Playwright |
| `pointer: coarse` — `data-input-mode="native"` set | Playwright |
| `pointer: fine` — `data-input-mode="custom"` set, `aria-hidden` removed from `.Custom` | Playwright |
| `.Segments` `aria-labelledby` resolves to associated `<label>` text | Playwright |
| `.Segments` falls back to `data-label-field` when no `<label for>` found | Playwright |
| Segment placeholder state: `aria-valuenow` absent, `aria-valuetext` = placeholder string | Playwright |
| Segment filled state: `aria-valuenow` present, `aria-valuetext` = localized string | Playwright |
| Segment: ArrowUp/Down increments/decrements, wraps at boundary | Playwright |
| Segment: day first digit > 3 auto-advances immediately | Playwright |
| Segment: month first digit > 1 auto-advances immediately | Playwright |
| Segment: ambiguous first digit (day=3, month=1) advances after 1 second | Playwright |
| Segment: year advances after 4 digits | Playwright |
| Segment: Backspace clears and moves focus back | Playwright |
| Segment: `aria-valuemax` on day updates when month changes to February | Playwright |
| Segment → native sync on complete date | Playwright |
| Native autofill → segment display sync | Playwright |
| Form reset → segments restore to placeholder, no live region announcement | Playwright |
| Calendar element does not exist in DOM when closed | Playwright |
| Calendar is a child of `<body>` when open | Playwright |
| Calendar removed from `<body>` on close | Playwright |
| No `aria-controls` on trigger at any time | Playwright |
| Calendar opens, focus moves to selected date | Playwright |
| Calendar opens with no selection, focus moves to today | Playwright |
| Calendar opens with no selection and no today visible, focus moves to first non-disabled day | Playwright |
| Calendar: Escape closes, focus returns to trigger | Playwright |
| Calendar: outside click closes (click outside both root and calendar) | Playwright |
| Calendar: click inside calendar does not close | Playwright |
| Calendar: Tab wraps from last to first non-disabled element | Playwright |
| Calendar: Shift+Tab wraps from first to last non-disabled element | Playwright |
| Calendar: disabled day buttons excluded from Tab-wrap | Playwright |
| Calendar: disabled day buttons reachable via ArrowKey navigation | Playwright |
| Calendar: ArrowLeft/Right moves focus day by day | Playwright |
| Calendar: ArrowUp/Down moves focus by week | Playwright |
| Calendar: PageUp/Down navigates months (grid scope only) | Playwright |
| Calendar: PageUp/Down does not trigger when focus is on prev/next buttons | Playwright |
| Calendar: Home moves to first day of week row | Playwright |
| Calendar: End moves to last day of week row | Playwright |
| Calendar: Ctrl+Home moves to first non-disabled day of month | Playwright |
| Calendar: Ctrl+End moves to last non-disabled day of month | Playwright |
| Calendar: ArrowLeft from 1st navigates to previous month | Playwright |
| Calendar: date selection closes calendar, syncs native, announces via live region | Playwright |
| Calendar: outside-month day click navigates to that month and selects | Playwright |
| `aria-selected` is on `<td>`, not on `<button>` | Playwright |
| `aria-disabled="true"` is on `<td>` for disabled cells | Playwright |
| Dates outside min/max have `data-disabled` on `<td>`, activation has no effect | Playwright |
| `aria-label` on today's button includes today-label | Playwright |
| `aria-label` on selected button includes selected-label | Playwright |
| `aria-label` on today + selected button: today label precedes selected label | Playwright |
| `aria-label` on disabled button includes disabled-label | Playwright |
| Two instances on same page have distinct `id` values | Playwright |
| axe-core: zero violations on initial render | Playwright + axe |
| axe-core: zero violations with calendar open | Playwright + axe |
| Forced colors: component renders without broken states | Playwright |
| getDaysInMonth — leap year Feb 2024 = 29 | Vitest |
| getDaysInMonth — non-leap Feb 2023 = 28 | Vitest |
| ISO week number edge cases | Vitest |
| min/max constraint: day disabled at min/max boundary | Vitest |
| Timezone: `new Date(2026, 2, 24)` produces correct local date | Vitest |
| getWeekdayNames: always returns Monday-first 7-element array | Vitest |
| getWeekdayNames: sv-SE returns Swedish day names starting Monday | Vitest |
| getWeekdayNames: en-US returns English day names starting Monday | Vitest |
| getLocale: returns `data-locale` when set | Vitest |
| getLocale: falls back to `document.documentElement.lang` when `data-locale` absent | Vitest |
| getLocale: falls back to `"en"` when both absent | Vitest |
| registerLocale: registered strings are used by component on init | Vitest |
| registerLocale: falls back to `"en"` when locale has no registered strings | Vitest |
| registerLocale: overwriting an existing locale uses new strings | Vitest |

### 7.3 Manual SR test script

**Environment:** VoiceOver + Safari (macOS), VoiceOver + Safari (iOS), NVDA + Chrome (Windows)

| Step | Expected outcome |
|---|---|
| Tab into component | SR announces group label (field name) and first segment role + value |
| Adjust segment value | SR announces updated value via spinbutton role |
| Navigate between segments | SR announces each segment's label |
| Open calendar via trigger button | SR announces dialog title, focus confirmed inside dialog |
| Navigate calendar days via SR commands | SR announces full date string for each day |
| Navigate to today | SR announces today label appended to date |
| Navigate to disabled day via arrow-key | SR announces disabled label; activation has no effect |
| Navigate months | SR announces new month name via live heading |
| Select a date | SR announces selected date via `.Announce` live region; dialog closes |
| Return focus after close | Focus is on trigger button; SR confirms |
| Tab out of component | Focus exits component naturally |
| Form reset | Segments return to placeholder; SR makes no announcement |

---

## 8. Integration Notes

This component is a reference implementation in vanilla HTML/CSS/JS. Ports to other environments must preserve the same component contract.

**React / Vue / Svelte:** Preserve `data-*` attribute names as props. Map lifecycle hooks to `constructor` / `destroy`. Listen to native `change` event on the hidden input for value binding.

**CMS:** Map CMS fields to `data-*` attributes on the root element. Locale (`data-locale`) and min/max should be set server-side. Generic UI strings come from `DateField.registerLocale()` — call it once per locale, populated from your CMS translation layer. The only markup-level label is `data-label-field` (instance-specific field name, e.g. "Departure date") — populate it from your CMS content fields.

**Web Component:** Wrap `DateField` class in `connectedCallback` / `disconnectedCallback`. Expose `value` getter/setter that reads/writes the native input.

---

*Created: 2026-03-25 | Updated: 2026-03-25 (v1.4 — i18n contract: data-label-* replaced with registerLocale API)*
