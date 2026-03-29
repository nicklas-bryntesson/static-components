# DateField — Desktop Screen Reader Accessibility Findings

**Date:** 2026-03-29
**Status:** Pre-spec research — not yet a design decision

---

## Context

The DateField component renders two modes:

| Device | `pointer` media query | Mode | What SR gets |
|---|---|---|---|
| Phone / tablet (touch) | `coarse` | Display | Native `<input type="date">` — opacity:0 overlay, still in AT. VoiceOver gets native iOS date picker. ✓ |
| Desktop + mouse | `fine` | Custom | Custom spinbutton group |
| Desktop + keyboard only | `fine`* | Custom | Custom spinbutton group |
| Desktop + screen reader | `fine`* | Custom | Custom spinbutton group |
| Laptop + trackpad | `fine` | Custom | Custom spinbutton group |

*`pointer: fine` reflects the primary pointing device (mouse registered), not whether the mouse is in use. Keyboard-only and SR users on desktop machines still get `pointer: fine` → custom UI.

**The gap lives entirely on desktop.** Mobile SR users (VoiceOver on iPhone/iPad) get the native experience — `.Custom` stays `aria-hidden="true"` in display mode, native input is accessible in the AT via `opacity:0` (not `visibility:hidden`).

---

## Accessibility Tree Comparison

### Our custom component

```
group "Födelsedatum"  roledescription: date field
  spinbutton "År"     focusable settable  valuemin:1900  valuemax:2100  valuetext:1900
  spinbutton "Månad"  focusable settable  valuemin:1     valuemax:12    valuetext:januari
  spinbutton "Dag"    focusable settable  valuemin:1     valuemax:31    valuetext:1
  button "Öppna kalender"  focusable  expanded:false
StaticText "Valt datum: 1 januari 1900"   ← aria-live region, outside group
```

### Native `<input type="date">`

```
Date "Födelsedatum"  focusable  settable
  spinbutton "År År"      valuemin:1900  valuemax:2100  valuetext:1900
  StaticText "–"
  spinbutton "Månad Månad"  valuemin:1  valuemax:12  valuetext:01
  StaticText "–"
  spinbutton "Dag Dag"    valuemin:1  valuemax:31  valuetext:01
  button "Visa datumväljaren"  focusable
```

---

## Gap Analysis

### 1. Tab navigation between segments — **potentially blocking**

Native: Tab advances between segments (År → Månad → Dag).
Custom: Tab enters the first segment, then jumps to the calendar button. Arrow keys move between segments.

**The failure mode:** SR user Tabs into first segment, Tabs again expecting month, lands on calendar button, Tabs again — exits the field. Date was never entered. Nothing told them to use arrow keys instead.

### 2. No interaction instructions — **important**

Nothing in the AT tells the user they need arrow keys to move between segments. The `roledescription: date field` describes what it is, not how to use it. Sighted users can see the three separate segment boxes and infer; SR users cannot.

### 3. Separators not exposed — **minor**

Native exposes `StaticText "–"` between segments, giving positional context as the user navigates ("År 1900 – Månad 01 – Dag 01"). Custom hides them via `aria-hidden="true"`.

### 4. `Date` role vs `group` — **unavoidable**

Native gets a browser-level `Date` semantic role. Custom uses `group` + `roledescription: date field`. SRs recognise the native role natively. The custom approach is the closest reachable equivalent — cannot be fully closed.

### 5. Doubled labels in native — **we're better here**

Native announces `"År År"`, `"Månad Månad"` (browser quirk duplicating the name). Custom announces `"År"`, `"Månad"` — cleaner.

### 6. Announce region has no field context — **worth investigating**

`StaticText "Valt datum: 1 januari 1900"` sits outside the group in the AT. An SR user navigating the page will encounter this text with no surrounding context telling them which field it belongs to. On a form with multiple date fields this becomes ambiguous.

---

## Open Questions for Planning

- Fix gap #1 via **Tab-between-segments** (3 Tab stops, matches native) or **instructions** (aria-description) or both?
- Does digit entry auto-advance to next segment? (Not verified — check `_handleDigit` in DateField.ts)
- Should separators be exposed to AT? Does it help or add noise?
- Should the announce region be associated more tightly to the field (e.g. `aria-describedby` from root to announce element)?
