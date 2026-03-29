# DateField ID Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `id`, `name`, `min`, and `max` from the inner `<input>` to `data-*` attributes on the wrapper so the DateField component has a clean outer interface.

**Architecture:** JS reads `data-id`, `data-name`, `data-min`, `data-max` from the root wrapper during `_init()` and applies them to the native input. All internal aria IDs are derived from `fieldId` (the value of `data-id`) using a consistent suffix pattern, replacing the current `instanceId`-based names. The `fieldId` is stored as `this.fieldId` on the instance so it is accessible in `_initInteractive()` and `_openCalendar()`.

**Tech Stack:** TypeScript (strict), Vitest + jsdom (unit), Playwright (e2e)

---

### Task 1: Write failing unit tests for the new init behaviour

**Files:**
- Modify: `tests/DateField.unit.test.ts`

- [ ] **Step 1: Add the new describe block at the end of the file**

Append after the last `describe` block in `tests/DateField.unit.test.ts`:

```ts
describe('DateField — prop application from wrapper data attributes', () => {
  it('applies data-id to native input id', () => {
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.id = 'my-date'
    el.dataset.name = 'mydate'
    el.dataset.locale = 'sv-SE'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group">
          <button class="Trigger" type="button" aria-expanded="false" aria-haspopup="dialog"></button>
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
    expect(instance.native.id).toBe('my-date')
    el.remove()
  })

  it('applies data-name to native input name', () => {
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.id = 'my-date'
    el.dataset.name = 'mydate'
    el.dataset.locale = 'sv-SE'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group">
          <button class="Trigger" type="button" aria-expanded="false" aria-haspopup="dialog"></button>
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
    expect(instance.native.name).toBe('mydate')
    el.remove()
  })

  it('applies data-min and data-max to native input', () => {
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.id = 'my-date'
    el.dataset.name = 'mydate'
    el.dataset.min = '2000-01-01'
    el.dataset.max = '2099-12-31'
    el.dataset.locale = 'sv-SE'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group">
          <button class="Trigger" type="button" aria-expanded="false" aria-haspopup="dialog"></button>
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
    expect(instance.native.min).toBe('2000-01-01')
    expect(instance.native.max).toBe('2099-12-31')
    el.remove()
  })

  it('falls back to datefield-{instanceId} when data-id is absent', () => {
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.name = 'mydate'
    el.dataset.locale = 'sv-SE'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group">
          <button class="Trigger" type="button" aria-expanded="false" aria-haspopup="dialog"></button>
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
    expect(instance.native.id).toMatch(/^datefield-\d+$/)
    el.remove()
  })

  it('stores fieldId on instance', () => {
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.id = 'my-date'
    el.dataset.name = 'mydate'
    el.dataset.locale = 'sv-SE'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group">
          <button class="Trigger" type="button" aria-expanded="false" aria-haspopup="dialog"></button>
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
    expect(instance.fieldId).toBe('my-date')
    el.remove()
  })
})
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A 3 "prop application"
```

Expected: 5 failing tests — `instance.native.id`, `instance.native.name`, `instance.native.min/max`, fallback format, `instance.fieldId` all wrong or undefined.

---

### Task 2: Update `DateField.ts` — add `fieldId` property and prop-application in `_init()`

**Files:**
- Modify: `src/partials/components/DateField/DateField.ts`

- [ ] **Step 1: Add `fieldId` to the class property declarations**

Find the `// State` block around line 140. The current block ends with:
```ts
  min: Date | null
  max: Date | null
```

Add `fieldId` after `instanceId`:
```ts
  instanceId: number
  fieldId: string
  locale: string
```

- [ ] **Step 2: Apply props at the top of `_init()`**

The current `_init()` is:
```ts
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
```

Replace with:
```ts
  _init(): void {
    this.fieldId = this.root.dataset.id ?? `datefield-${this.instanceId}`
    this.native.id = this.fieldId
    this.native.name = this.root.dataset.name ?? ''
    if (this.root.dataset.min) this.native.min = this.root.dataset.min
    if (this.root.dataset.max) this.native.max = this.root.dataset.max
    this.announce.id = `${this.fieldId}-announce`

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

- [ ] **Step 3: Replace `instanceId`-based label ID in `_initInteractive()`**

Find in `_initInteractive()`:
```ts
      if (!labelEl.id) labelEl.id = `datefield-label-${this.instanceId}`
```

Replace with:
```ts
      if (!labelEl.id) labelEl.id = `${this.fieldId}-label`
```

- [ ] **Step 4: Replace `instanceId`-based calendar and month IDs in `_openCalendar()`**

Find in `_openCalendar()`:
```ts
    const calId = `datefield-calendar-${this.instanceId}`
    const monthId = `datefield-month-${this.instanceId}`
```

Replace with:
```ts
    const calId = `${this.fieldId}-calendar`
    const monthId = `${this.fieldId}-month`
```

- [ ] **Step 5: Run the new tests to confirm they pass**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -A 3 "prop application"
```

Expected: 5 passing tests.

---

### Task 3: Update `makeField` fixture and inline locale test fixtures

**Files:**
- Modify: `tests/DateField.unit.test.ts`

- [ ] **Step 1: Update `MakeFieldOptions` and `makeField()`**

Find `MakeFieldOptions` and `makeField()` (around line 206). Replace entirely with:

```ts
interface MakeFieldOptions {
  disabled?: boolean
  value?: string
  min?: string
  max?: string
  locale?: string
  id?: string
  name?: string
}

function makeField({ disabled = false, value = '', min = '', max = '', locale = 'sv-SE', id, name = 'testfield' }: MakeFieldOptions = {}): { el: HTMLElement; instance: DateField } {
  const fieldId = id ?? `df-test-${Math.random().toString(36).slice(2)}`
  const el = document.createElement('div')
  el.dataset.component = 'DateField'
  el.dataset.id = fieldId
  el.dataset.name = name
  el.dataset.locale = locale
  if (min) el.dataset.min = min
  if (max) el.dataset.max = max
  el.innerHTML = `
    <input class="Native" type="date"
      ${value    ? `value="${value}"` : ''}
      ${disabled ? 'disabled'         : ''}
    />
    <label for="${fieldId}">Test label</label>
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
```

- [ ] **Step 2: Update the four inline locale test fixtures**

These are the tests in `describe('DateField locale resolution')` and `describe('registerLocale fallback')` (lines ~122–200). Each builds an `el` inline with `<input class="Native" id="t1" ...>` etc. For each one, remove the `id` attribute from the `<input>` and add `el.dataset.id = 'tN'` (matching the original value) above `el.dataset.component`:

**Test: 'falls back to en when resolved locale has no registered translation'** (id="t1"):
```ts
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.id = 't1'
    el.dataset.locale = 'fr'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
```

**Test: 'uses data-locale when set and registered'** (id="t2"):
```ts
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.id = 't2'
    el.dataset.locale = 'sv-SE'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
```

**Test: 'falls back to document.documentElement.lang when data-locale is absent'** (id="t3"):
```ts
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.id = 't3'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
```

**Test: 'falls back to en strings when locale is not registered'** (id="t4"):
```ts
    const el = document.createElement('div')
    el.dataset.component = 'DateField'
    el.dataset.id = 't4'
    el.dataset.locale = 'de'
    el.innerHTML = `
      <input class="Native" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
```

- [ ] **Step 3: Run the full unit test suite**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

---

### Task 4: Update `DateField.html`

**Files:**
- Modify: `src/partials/components/DateField/DateField.html`

- [ ] **Step 1: Update the wrapper and native input**

Replace the current wrapper + input:
```html
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
```

With:
```html
<div
  class="DateField"
  data-component="DateField"
  data-id="birthdate"
  data-name="birthdate"
  data-locale="sv-SE"
  data-min="1900-01-01"
  data-max="2100-12-31"
>
  <input
    class="Native"
    type="date"
  />
```

- [ ] **Step 2: Run the E2E tests**

```bash
npm run test:e2e
```

Expected: all tests pass. The label `for="birthdate"` still resolves correctly because JS sets `native.id = 'birthdate'` during init.

---

### Task 5: Commit

- [ ] **Step 1: Commit**

```bash
git add src/partials/components/DateField/DateField.html \
        src/partials/components/DateField/DateField.ts \
        tests/DateField.unit.test.ts
git commit -m "feat(DateField): move id/name/min/max to wrapper data attributes"
```
