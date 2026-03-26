# DateField — Display Mode (Mobile) Design

**Date:** 2026-03-26
**Status:** Approved

## Problem

On `pointer: coarse` (mobile), the DateField JS sets `data-input-mode="native"` and returns early.
This leaves `.Custom` as `display: none` and `.Native` as a raw `input[type="date"]` — which on iOS Safari
renders as an empty or minimal box with no visual treatment matching the desktop custom UI.

The field is effectively invisible or unstyled on mobile.

## Goal

On mobile, the DateField should look visually identical to the desktop custom UI (segments + calendar icon),
but tapping anywhere on it opens the native date picker instead of the custom keyboard/calendar interaction.

## Architecture

Three input modes replace the previous two:

| Mode | Trigger | Custom visible | Native visible | Custom interactive |
|------|---------|---------------|---------------|-------------------|
| `"custom"` | pointer: fine | Yes (aria-hidden removed) | Absolutely hidden | Yes |
| `"display"` | pointer: coarse | Yes (aria-hidden stays) | Absolutely positioned, opacity: 0 | No |

`"native"` mode is removed. `"display"` replaces it.

JS init splits into two explicit paths:

```
_init()
  ├─ pointer: coarse → _initDisplay()
  └─ pointer: fine   → _initInteractive()
```

## HTML

No changes. Existing structure is sufficient:
- `.DateField` already has `position: relative`
- `.Custom` and `.Native` are already present in the correct DOM order

## CSS

Add a `[data-input-mode="display"]` block:

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

`.Custom` in normal flow sets the height of `.DateField`.
`.Native` stretches to cover the same area via `inset: 0`.
Taps on the visual display element have `pointer-events: none` and fall through to `.Native`,
opening the native date picker.

`aria-hidden="true"` stays on `.Custom` in display mode — it is purely decorative.
Screen readers on iOS reach the native input directly (opacity: 0 but fully accessible).

## JS

### `_init()` split

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
```

### `_initDisplay()`

```js
_initDisplay() {
  this.root.dataset.inputMode = 'display'

  // Render segments visually (same _buildSegments() call as interactive mode)
  // Does NOT bind keyboard/click handlers on segments
  this._buildSegments()

  // Show current native value in segments if present
  if (this.native.value) this._syncSegmentsFromNative()

  // Keep segments updated on autofill or programmatic value change
  this.native.addEventListener('change', this._handleNativeChange)

  // Form reset → clear segments to placeholder state
  this.native.form?.addEventListener('reset', () => {
    this._clearSegments()
  })
}
```

### `_initInteractive()`

Identical to everything currently executed after the coarse check in `_init()`. No changes.

### `destroy()`

No changes needed — removes all event listeners regardless of mode.

### `_handleNativeChange`

Already used for desktop sync. Works in both modes without changes.

## Accessibility

- `.Custom` keeps `aria-hidden="true"` in display mode. It is decorative.
- `.Native` is opacity: 0 but present in the accessibility tree. iOS VoiceOver reaches it normally.
- The existing `<label for="...">` association works unchanged — label tap also opens the picker.

## What is NOT in scope

- Segment interactivity on mobile (keyboard navigation, calendar picker)
- `showPicker()` approach (fragile, gesture-chain dependent)
- Any changes to desktop (`"custom"` mode) behavior
