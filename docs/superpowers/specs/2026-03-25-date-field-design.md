# DateField — Design Spec

**Version:** 1.0
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

### 2.3 Data-attribute contract — root element

| Attribute | Values | Set by |
|---|---|---|
| `data-component` | `"DateField"` | Markup / server |
| `data-input-mode` | `native \| custom` | JS (pointer detection) |
| `data-state` | `idle \| open` | JS (calendar open/closed) |
| `data-locale` | e.g. `"sv-SE"` | Server (optional) |
| `data-min` | `yyyy-mm-dd` | Server (optional) |
| `data-max` | `yyyy-mm-dd` | Server (optional) |

### 2.4 Data-attribute contract — translatable labels

All screen-reader-visible strings are `data-*` attributes on the root. JS reads exclusively from these — never hardcoded strings. English fallback values are defined in JS for each attribute.

| Attribute | Example value (sv-SE) | Fallback (en) |
|---|---|---|
| `data-label-day` | `"Dag"` | `"Day"` |
| `data-label-month` | `"Månad"` | `"Month"` |
| `data-label-year` | `"År"` | `"Year"` |
| `data-label-open-calendar` | `"Öppna kalender"` | `"Open calendar"` |
| `data-label-close-calendar` | `"Stäng kalender"` | `"Close calendar"` |
| `data-label-prev-month` | `"Föregående månad"` | `"Previous month"` |
| `data-label-next-month` | `"Nästa månad"` | `"Next month"` |
| `data-label-today` | `"idag"` | `"today"` |
| `data-label-selected` | `"valt"` | `"selected"` |
| `data-label-disabled` | `"ej tillgängligt"` | `"not available"` |
| `data-label-announce` | `"Valt datum:"` | `"Selected date:"` |

### 2.5 Data-attribute contract — segment elements

| Attribute | Description |
|---|---|
| `data-segment` | `day \| month \| year` |
| `data-placeholder` | Present when segment has no value |
| `data-focused` | Set by JS on the active segment |

### 2.6 Data-attribute contract — calendar day buttons

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
3. No hardcoded third fallback

`navigator.language` is intentionally not used — it reflects the user's browser preference, not the page's language. A French visitor on a Swedish site should see Swedish month names.

---

## 3. HTML Structure

```html
<div
  class="DateField"
  data-component="DateField"
  data-locale="sv-SE"
  data-min="1900-01-01"
  data-max="2100-12-31"
  data-label-day="Dag"
  data-label-month="Månad"
  data-label-year="År"
  data-label-open-calendar="Öppna kalender"
  data-label-close-calendar="Stäng kalender"
  data-label-prev-month="Föregående månad"
  data-label-next-month="Nästa månad"
  data-label-today="idag"
  data-label-selected="valt"
  data-label-disabled="ej tillgängligt"
  data-label-announce="Valt datum:"
>
  <!-- Source of truth — always in DOM, posts with form -->
  <input
    class="Native"
    type="date"
    name="birthdate"
    min="1900-01-01"
    max="2100-12-31"
  />

  <!-- Custom UI — hidden by default, JS sets data-input-mode="custom" on root -->
  <div class="Custom" aria-hidden="true">

    <div class="Segments" role="group" aria-labelledby="datefield-label-1">

      <span
        class="Segment"
        role="spinbutton"
        aria-label="Dag"
        aria-valuenow="24"
        aria-valuemin="1"
        aria-valuemax="31"
        aria-valuetext="24"
        tabindex="0"
        data-segment="day"
        data-placeholder
      >dd</span>

      <span class="Separator" aria-hidden="true">/</span>

      <span
        class="Segment"
        role="spinbutton"
        aria-label="Månad"
        aria-valuenow="3"
        aria-valuemin="1"
        aria-valuemax="12"
        aria-valuetext="mars"
        tabindex="-1"
        data-segment="month"
        data-placeholder
      >mm</span>

      <span class="Separator" aria-hidden="true">/</span>

      <span
        class="Segment"
        role="spinbutton"
        aria-label="År"
        aria-valuenow="2026"
        aria-valuemin="1900"
        aria-valuemax="2100"
        aria-valuetext="2026"
        tabindex="-1"
        data-segment="year"
        data-placeholder
      >åååå</span>

      <button
        type="button"
        class="Trigger"
        aria-label="Öppna kalender"
        aria-expanded="false"
        aria-haspopup="dialog"
        aria-controls="datefield-calendar-1"
      ><!-- SVG calendar icon --></button>

    </div>

    <div
      id="datefield-calendar-1"
      class="Calendar"
      role="dialog"
      aria-modal="true"
      aria-labelledby="datefield-month-1"
      hidden
    >
      <div class="CalendarHeader">
        <button type="button" aria-label="Föregående månad">&#8249;</button>
        <span id="datefield-month-1" aria-live="polite" aria-atomic="true">Mars 2026</span>
        <button type="button" aria-label="Nästa månad">&#8250;</button>
      </div>

      <table class="Grid" role="grid" aria-labelledby="datefield-month-1">
        <thead>
          <tr role="row">
            <th scope="col"><abbr title="Måndag">Mån</abbr></th>
            <th scope="col"><abbr title="Tisdag">Tis</abbr></th>
            <th scope="col"><abbr title="Onsdag">Ons</abbr></th>
            <th scope="col"><abbr title="Torsdag">Tor</abbr></th>
            <th scope="col"><abbr title="Fredag">Fre</abbr></th>
            <th scope="col"><abbr title="Lördag">Lör</abbr></th>
            <th scope="col"><abbr title="Söndag">Sön</abbr></th>
          </tr>
        </thead>
        <tbody>
          <!-- Generated by JS. Example day: -->
          <tr role="row">
            <td role="gridcell">
              <button
                type="button"
                tabindex="-1"
                aria-label="24 mars 2026"
                aria-selected="false"
                data-date="2026-03-24"
              >24</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>

  <!-- Live region — announces selected date to screen readers -->
  <div class="Announce" aria-live="polite" aria-atomic="true" hidden></div>

</div>
```

**Key structural rules:**

- `aria-hidden="true"` on `.Custom` is removed by JS when `data-input-mode="custom"` is set — without this, screen readers ignore the entire custom UI
- `.Announce` is never visually rendered but always in the DOM
- Month name in `.CalendarHeader span` has `aria-live="polite"` — SR announces month changes automatically
- Weekday `<abbr>` elements: visual short form, SR reads the full `title` value
- Day buttons: `aria-label` includes full date string (e.g. "24 mars 2026, idag, valt"), not just the number

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

Calendar state:
- [data-state="open"]: Calendar visible
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

  /* ===== CALENDAR ===== */

  & .Calendar {
    display: none;
    position: absolute;
    inset-block-start: 100%;
    inset-inline-start: 0;
    margin-block-start: 0.25rem;
    background: Canvas;
    border: 1px solid;
    padding: 0.75rem;
    z-index: 10;
  }

  &[data-state="open"] {
    & .Calendar {
      display: block;
    }
  }

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

      &[data-today] {
        font-weight: bold;
        text-decoration: underline;
      }

      &[data-selected] {
        background-color: Highlight;
        color: HighlightText;
      }

      &[data-disabled] {
        --_disabledColor: #767676; /* 4.54:1 against Canvas — WCAG AA */
        color: var(--_disabledColor);
        cursor: not-allowed;
      }

      &[data-outside-month] {
        color: GrayText;
      }
    }
  }
}
```

**Key CSS rules:**

- `data-disabled` uses explicit color (`#767676`), never `opacity` — opacity-based disabled states typically fail WCAG AA contrast requirements
- Calendar visibility is controlled by `&[data-state="open"]` gate on the root — JS owns the state attribute, CSS owns the visibility. JS never toggles `display` directly.
- `:focus-visible` is used throughout, never `:focus` — avoids unwanted focus rings on mouse interaction

---

## 5. JS Contract

### 5.1 Class API

Follows the same attach pattern as `CoverCompositionVideo`:

```js
class DateField {
  static attach(parent = document) { /* scan and instantiate */ }
  constructor(el) { /* init */ }
  destroy() { /* clean up listeners, remove injected elements */ }
}
```

### 5.2 Initialization sequence

1. Detect pointer type via `window.matchMedia("(pointer: coarse)")`
2. Set `data-input-mode` on root
3. If `custom`: remove `aria-hidden` from `.Custom`, set up segment interaction, set up calendar, set up value sync
4. If `native`: no further setup needed

### 5.3 State machine

```
idle  ──[OPEN]──▶  open
open  ──[CLOSE]──▶ idle
open  ──[SELECT]──▶ idle
```

JS sets `data-state` on root. CSS reacts. JS never toggles `display` directly on `.Calendar`.

### 5.4 Segment keyboard contract

Implemented for keyboard-only users. Screen reader users navigate via their own commands against the semantic markup — see section 6.

| Key | Behavior |
|---|---|
| `ArrowUp` | Increment segment, wrap at max |
| `ArrowDown` | Decrement segment, wrap at min |
| `ArrowLeft` | Move focus to previous segment |
| `ArrowRight` | Move focus to next segment |
| `0–9` | Digit entry, auto-advance when segment is full |
| `Backspace` | Clear segment, move focus to previous segment |
| `Escape` | Close calendar if open |

**Auto-advance rules:**
- Day: first digit > 3 → advance immediately. Otherwise wait for second digit.
- Month: first digit > 1 → advance immediately. Otherwise wait for second digit.
- Year: advance after 4 digits.

**Roving tabindex:** Only one segment holds `tabindex="0"` at a time. `ArrowLeft`/`ArrowRight` moves it. `Tab` exits the segment group naturally.

**ARIA updates on each segment change:**
- `aria-valuenow` — numeric value (e.g. `3`)
- `aria-valuetext` — human-readable value (e.g. `"mars"` for month, localized)
- `data-placeholder` — removed when value is set, added when cleared

### 5.5 Calendar behavior contract

**Opening:**
1. Set `data-state="open"` on root
2. Update trigger: `aria-expanded="true"`, `aria-label` → close label
3. Move focus to: selected date → today → first non-disabled day

**Closing (Escape, outside click, or date selected):**
1. Set `data-state="idle"` on root
2. Update trigger: `aria-expanded="false"`, `aria-label` → open label
3. Return focus to trigger button

**Focus trap:**
`Tab` and `Shift+Tab` cycle only within the calendar while it is open.

**Month navigation:**
Update month heading text. `aria-live="polite"` on the heading announces the new month to SR automatically.

**Day keyboard navigation** (for keyboard-only users):

| Key | Behavior |
|---|---|
| `ArrowLeft` / `ArrowRight` | Previous / next day |
| `ArrowUp` / `ArrowDown` | Previous / next week |
| `PageUp` / `PageDown` | Previous / next month |
| `Home` / `End` | First / last day of month |
| `Enter` / `Space` | Select date |
| `Escape` | Close calendar |

**Roving tabindex in grid:** One day button holds `tabindex="0"` at a time. All others hold `tabindex="-1"`.

**Day `aria-label` format:**
`"24 mars 2026"` — plain date for normal days
`"24 mars 2026, idag"` — today (appends `data-label-today`)
`"24 mars 2026, valt"` — selected (appends `data-label-selected`)
`"24 mars 2026, ej tillgängligt"` — disabled (appends `data-label-disabled`)

### 5.6 Value sync contract

```
Segment input  ──▶  syncToNative()  ──▶  native.value = "yyyy-mm-dd"
                                     ──▶  dispatch "change" (bubbles: true)

native "change" (autofill)  ──▶  syncFromNative()  ──▶  update segment display
form "reset"                ──▶  clearSegments()   ──▶  restore all segments to placeholder
```

**Timezone rule (critical):**
Always construct dates as `new Date(year, month, day)` — never `new Date("yyyy-mm-dd")`.
ISO string parsing is treated as UTC midnight and will produce the wrong local date in negative-offset timezones.

### 5.7 Locale rendering

```js
getLocale()              // data-locale → document.documentElement.lang
getMonthName(y, m)       // Intl.DateTimeFormat, e.g. "mars"
getWeekdayNames()        // Intl.DateTimeFormat, normalized to Monday-start
```

---

## 6. Accessibility Requirements

### 6.1 Screen reader philosophy

The keyboard shortcuts in section 5.4 and 5.5 are implemented **for keyboard-only users**, not for screen reader users. VoiceOver (macOS) uses `VO + arrow keys` to navigate; NVDA and JAWS use their own command sets. The component must not assume or document that SR users press specific keys.

Correct SR support is achieved through:
- Correct semantic HTML elements
- Correct ARIA roles, properties, and states kept in sync with actual UI state
- Real focus management (roving tabindex — not `aria-activedescendant`)
- Live regions announcing dynamic content

### 6.2 WCAG 2.2 AA checklist

- [ ] All interactive elements are keyboard reachable
- [ ] Focus order follows DOM order — `tabindex > 0` is never used
- [ ] Focus is always visible via `:focus-visible` outline
- [ ] Focus outline is visible against all background colors (minimum 3:1 contrast against adjacent colors — WCAG 2.2 2.4.11)
- [ ] All form controls have associated labels
- [ ] `aria-label` on every segment reflects current value and role
- [ ] `aria-expanded` on trigger reflects calendar open/closed state
- [ ] `aria-live` regions announce: month navigation, selected date
- [ ] Disabled days use `aria-disabled="true"` — not the `disabled` attribute (which removes elements from focus entirely and makes them undiscoverable to SR)
- [ ] Disabled day color achieves 4.5:1 contrast against background (explicit color, not opacity)
- [ ] No color-only state communication — `data-today` uses bold + underline, not color alone
- [ ] Component works correctly in forced colors / high contrast mode (system color keywords)
- [ ] Motion: no animations that violate `prefers-reduced-motion` (not applicable in v1 — no animations)
- [ ] All visible text meets 4.5:1 contrast (normal text) or 3:1 (large text)

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
| `pointer: fine` — `data-input-mode="custom"` set | Playwright |
| Segment: ArrowUp/Down increments/decrements | Playwright |
| Segment: digit entry, auto-advance day > 3 | Playwright |
| Segment: digit entry, auto-advance month > 1 | Playwright |
| Segment: Backspace clears and moves focus back | Playwright |
| Segment → native sync on complete date | Playwright |
| Native autofill → segment display sync | Playwright |
| Form reset → segments restore to placeholder | Playwright |
| Calendar opens, focus moves to selected date | Playwright |
| Calendar: Escape closes, focus returns to trigger | Playwright |
| Calendar: ArrowKey navigation moves focus | Playwright |
| Calendar: PageUp/Down navigates months | Playwright |
| Calendar: date selection closes calendar and syncs native | Playwright |
| Dates outside min/max have `data-disabled` and are not selectable | Playwright |
| `aria-label` on today includes today-label | Playwright |
| `aria-label` on selected date includes selected-label | Playwright |
| axe-core: zero violations on initial render | Playwright + axe |
| axe-core: zero violations with calendar open | Playwright + axe |
| Forced colors: component renders without broken states | Playwright |
| getDaysInMonth — leap year Feb 2024 = 29 | Vitest |
| getDaysInMonth — non-leap Feb 2023 = 28 | Vitest |
| ISO week number edge cases | Vitest |
| min/max constraint: prev-month disabled at min boundary | Vitest |
| Timezone: `new Date(2026, 2, 24)` never shifts date | Vitest |
| Locale: sv-SE weekdays start on Monday | Vitest |
| Locale: en-US weekdays start on Sunday | Vitest |

### 7.3 Manual SR test script

**Environment:** VoiceOver + Safari (macOS), VoiceOver + Safari (iOS), NVDA + Chrome (Windows)

| Step | Expected outcome |
|---|---|
| Tab into component | SR announces segment role and current value |
| Adjust segment value | SR announces updated value |
| Navigate between segments | SR announces each segment label |
| Open calendar via trigger | SR announces dialog open, focus confirmed inside dialog |
| Navigate calendar days | SR announces full date for each day |
| Navigate to today | SR announces today label |
| Navigate to disabled day | SR announces disabled label |
| Navigate months | SR announces new month name |
| Select a date | SR announces selected date via live region, dialog closes |
| Return focus after close | Focus is on trigger button |
| Tab out of component | Focus exits component naturally |

---

## 8. Integration Notes

This component is a reference implementation in vanilla HTML/CSS/JS. Ports to other environments must preserve the same component contract.

**React / Vue / Svelte:** Preserve `data-*` attribute names as props. Map lifecycle hooks to `constructor` / `destroy`. Listen to native `change` event on the hidden input for value binding.

**CMS:** Map CMS fields to `data-*` attributes on the root element. Locale and min/max should be set server-side.

**Web Component:** Wrap `DateField` class in `connectedCallback` / `disconnectedCallback`. Expose `value` getter/setter that reads/writes the native input.

---

*Created: 2026-03-25*
