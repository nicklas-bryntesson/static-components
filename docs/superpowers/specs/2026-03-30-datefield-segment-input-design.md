# DateField Segment Input — Design Spec

**Date:** 2026-03-30
**Status:** Approved

---

## Problem

The custom segment input pipeline has four behavioural gaps compared to a native browser date field:

1. **Invisible digit buffering** — typed digits don't appear visually until the segment commits and auto-advances. The segment stays on its placeholder or previous value while the buffer accumulates.
2. **No overflow clamping on two-digit input** — the `num > threshold` guard fires on two-digit values (e.g. 34 for day, 13 for month), bypassing the clamping branch and committing an out-of-range value directly.
3. **No blur flush** — if the user types a partial value and tabs away, the pending timer fires later into the wrong context (focus has already moved), or the value is never committed at all (year with < 4 digits stays as placeholder without clearing).
4. **No cross-segment re-clamp** — changing month doesn't re-clamp an existing day value that now exceeds the new month's maximum.

---

## Root Cause

`_handleDigit` uses a `num`-first dispatch structure (`if num > 3`) that runs on both single and two-digit buffer values. This means:
- The clamping branch (`length === 2`) is unreachable for out-of-range two-digit numbers.
- Visual feedback and blur handling were never wired into the accumulation loop.

---

## Scope

All changes are in `DateField.ts`. No HTML, CSS, locale, or public API changes. The following private members are modified or added:

| Member | Change |
|---|---|
| `_handleDigit` | Refactored — length-first dispatch |
| `_bindSegmentEvents` | Enhanced — blur handler calls `_flushDigitBuffer` |
| `_setSegmentValue` (month path) | Enhanced — re-clamps day after month change |
| `_showBuffer` | New helper |
| `_flushDigitBuffer` | New helper |

---

## Design

### `_handleDigit` — length-first dispatch

Restructure to branch on buffer length first. Clamping via `Math.max(min, Math.min(max, num))` is applied in every branch — no branch skips it.

After every `_digitBuffer` append, call `_showBuffer` immediately before any commit logic.

**Day and month (1–2 digit segments):**

```
length === 1 AND num >= fastThreshold  →  clamp + commit + advance
length === 2                           →  clamp + commit + advance
length === 1 AND num < fastThreshold   →  start 1s timer → clamp + commit + advance
```

Fast-advance threshold: day ≥ 4, month ≥ 2. These are the lowest single digits that can only form a valid value without a second digit (day 4–9, month 2–9).

Day minimum is 1 in all branches — eliminates the day=0 bug when the timer fires with a single "0" digit.

**Year (4-digit segment):**

```
length === 4  →  clamp + commit + advance
otherwise     →  keep accumulating (no timer)
```

### `_showBuffer` helper

Called after every buffer append, before commit logic.

- Removes `data-placeholder`
- Sets `textContent` to the raw buffer string (e.g. "3", "202")
- Sets `aria-valuetext` to the same string

Does not call `_setSegmentValue`. That remains the commit-only path.

### `_flushDigitBuffer(seg)` helper

Called from the blur handler when focus leaves a segment.

- If buffer is empty → no-op
- Cancels the pending timer
- **Day / month:** commits the buffer value clamped to `[min, max]`
- **Year with < 4 digits:** calls `_clearSegment` (matches native Chrome — partial year on blur resets to placeholder)
- Clears `_digitBuffer`

### Blur handler update

`_bindSegmentEvents` adds one call to the existing blur handler:

```ts
const blurHandler = () => {
  seg.removeAttribute('data-focused')
  this._flushDigitBuffer(seg)  // new
}
```

### Cross-segment re-clamp

In the month path of `_setSegmentValue`, after updating `aria-valuemax` on the day segment, add:

```ts
const currentDay = this._getCurrentSegmentValue(daySeg)
if (currentDay !== null && currentDay > daysInMonth) {
  this._setSegmentValue(daySeg, daysInMonth)
}
```

This silently corrects e.g. day=31 → day=28 when the user changes month to February.

---

## Tests

New unit test cases in `DateField.unit.test.ts`:

- Day: type "3" then "4" → value clamps to month max (not 34)
- Day: single "0" via timer → clamps to 1
- Month: type "1" then "3" → value clamps to 12 (not 13)
- Year: type 3 digits then blur → segment resets to placeholder
- Day: type 1 digit then blur → commits clamped value
- Month: type 1 digit then blur → commits clamped value
- Month change: existing day=31, change to month with 28 days → day re-clamps to 28

All existing `_handleDigit`, `_getSegmentLimits`, and segment value tests remain.
