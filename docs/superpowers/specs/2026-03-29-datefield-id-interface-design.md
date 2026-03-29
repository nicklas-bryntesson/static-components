# DateField: ID Interface Design

**Date:** 2026-03-29
**Status:** Approved

## Problem

`id` and `name` are currently hardcoded on the inner `<input class="Native">`. When porting to a framework component (Razor TagHelper, Vue, etc.), these are consumer-facing props — they belong on the outer component interface, not embedded in inner markup.

## Goal

The `<div data-component="DateField">` wrapper becomes the complete component interface. All identity and configuration props live there. The inner HTML is an implementation detail.

## HTML Contract

Before:
```html
<label for="birthdate">Födelsedatum</label>
<div class="DateField" data-component="DateField" data-locale="sv-SE" data-min="1900-01-01" data-max="2100-12-31">
  <input class="Native" id="birthdate" type="date" name="birthdate" min="1900-01-01" max="2100-12-31" />
```

After:
```html
<label for="birthdate">Födelsedatum</label>
<div class="DateField" data-component="DateField" data-id="birthdate" data-name="birthdate" data-locale="sv-SE" data-min="1900-01-01" data-max="2100-12-31">
  <input class="Native" type="date" />
```

The native input carries no attributes in the authored HTML. `min`/`max` are also dropped from the input since JS already reads them from `data-min`/`data-max`.

## JS Init Behavior

At the top of `_init()`, before any other setup, JS reads and applies all interface props to the native input:

```ts
const fieldId = this.root.dataset.id ?? `datefield-${this.instanceId}`
const fieldName = this.root.dataset.name ?? ''

this.native.id = fieldId
this.native.name = fieldName
if (this.root.dataset.min) this.native.min = this.root.dataset.min
if (this.root.dataset.max) this.native.max = this.root.dataset.max
```

`data-id` is a required prop by convention. The `instanceId` fallback prevents hard failures if omitted, but should not be relied on.

## Derived Internal IDs

All internal aria IDs derive from `fieldId` using a consistent suffix pattern:

| Element | Derived ID |
|---|---|
| External `<label>` (stamped if missing an id) | `{fieldId}-label` |
| `.Announce` region | `{fieldId}-announce` |
| Calendar dialog | `{fieldId}-calendar` |

This guarantees uniqueness across multiple DateField instances on the same page, as long as each instance receives a unique `data-id` — the same responsibility consumers already have with any HTML `id`.

The existing `_initInteractive()` label lookup (`label[for="${this.native.id}"]`) continues to work unchanged, because `native.id` is set before `_initInteractive()` runs.

## Scope

- `DateField.html` — remove `id`, `name`, `min`, `max` from `<input>`; add `data-id`, `data-name` to wrapper
- `DateField.ts` — apply props in `_init()`; replace `instanceId`-based internal IDs with `fieldId`-derived suffixes
- Unit tests — update fixtures to use `data-id`/`data-name` on wrapper
- E2E tests — update HTML fixtures accordingly
