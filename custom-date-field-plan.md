# Custom Date Field — Plan

## Konceptet

Målet är ett date-fält med full visuell kontroll på desktop/tablet, men som utnyttjar native OS-picker på mobil där den faktiskt är bra.

**Device-detektering**
Använd `window.matchMedia("(pointer: coarse)")` — aldrig bredd.
- `pointer: fine` → desktop custom UI
- `pointer: coarse` → mobile native UI

En iPad med tangentbord är `pointer: fine`. En Surface touch är `pointer: coarse`. Bredd ljuger, pointer ljuger inte.

**Single source of truth**
Ett dolt `input[type="date"]` äger alltid värdet i `yyyy-mm-dd`. Custom UI skriver till det. Aldrig tvärtom.

---

## Tillgänglighet — A11y Pitfalls

### `aria-hidden` måste spegla synlighet

`.date-field__desktop` startar med `aria-hidden="true"`. Det måste tas bort när det visas på desktop — annars läser skärmläsaren aldrig upp det custom UI:et.

```js
// När pointer:fine detekteras
desktopEl.removeAttribute("aria-hidden")
// Native döljs visuellt men behöver fortfarande vara tillgänglig för SR på mobile
```

### Toggle-knappen måste kommunicera state

```html
<button
  class="date-field__toggle"
  type="button"
  aria-label="Välj datum"
  aria-expanded="false"
  aria-haspopup="dialog">
  <!-- ikon -->
</button>
```

`aria-expanded` ska uppdateras till `"true"` när kalendern öppnas. Utan det vet inte SR-användaren att något händer.

### Display-fältet behöver label och live region

`readonly` input utan label är ett vanligt WCAG-fel. SR läser upp det som ett textfält men ger ingen kontext.

```html
<label for="date-display" class="sr-only">Valt datum</label>
<input
  id="date-display"
  class="date-field__display"
  type="text"
  readonly
  autocomplete="off"
  aria-describedby="date-format-hint"
/>
<span id="date-format-hint" class="sr-only">Format: dag månad år</span>

<!-- Live region — annonserar valt datum till SR -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="date-announce"></div>
```

```js
// Efter selectDate()
document.getElementById("date-announce").textContent =
  `Valt datum: ${date.toLocaleDateString("sv-SE", { dateStyle: "long" })}`
```

### Kalender-dialogen — fokus och trap

Fokus MÅSTE flytta in i kalendern när den öppnas, och returnera till toggle-knappen när den stängs. Utan detta tappar tangentbordsanvändaren orienteringen.

```js
openCalendar() {
  this.calendar.hidden = false
  this.calendar.removeAttribute("aria-hidden")
  // Flytta fokus till valt datum, annars första tillgängliga dag
  const focusTarget = this.calendar.querySelector("[aria-selected='true']")
    ?? this.calendar.querySelector("[tabindex='0']")
  focusTarget?.focus()
}

closeCalendar() {
  this.calendar.hidden = true
  this.calendar.setAttribute("aria-hidden", "true")
  // Returnera fokus
  this.el.querySelector(".date-field__toggle").focus()
}
```

Fokus-trap inom dialogen — Tab ska inte lämna kalendern:

```js
calendar.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return
  const focusable = [...calendar.querySelectorAll("button:not([disabled])")]
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
})
```

### Korrekt grid-struktur

```html
<table class="date-field__days" role="grid" aria-labelledby="date-month-heading">
  <thead>
    <tr role="row">
      <!-- abbr ger SR det långa namnet, visuellt visas den korta -->
      <th scope="col" abbr="Måndag">Mån</th>
      <th scope="col" abbr="Tisdag">Tis</th>
      <!-- ... -->
    </tr>
  </thead>
  <tbody>
    <tr role="row">
      <td role="gridcell">
        <button
          type="button"
          aria-label="24 mars 2026"
          aria-selected="false"
          tabindex="-1">
          24
        </button>
      </td>
    </tr>
  </tbody>
</table>
```

Bara **ett** datum i taget har `tabindex="0"` — resterande har `-1`. Arrow-keys rör fokus inom gridet.

### Idag och valt datum — inte bara visuellt

Färg och font-weight räcker inte. SR ser inte visuella states.

```js
// Idag
btn.setAttribute("aria-label", "24 mars 2026, idag")

// Valt
btn.setAttribute("aria-selected", "true")
btn.setAttribute("aria-label", "24 mars 2026, valt")

// Disabled — aria-disabled istället för disabled
// disabled tar bort elementet från tab-ordningen helt
// aria-disabled håller det discoverable men inte valbart
btn.setAttribute("aria-disabled", "true")
btn.setAttribute("aria-label", "24 mars 2026, ej tillgängligt")
```

### Live region för månadsnavigation

När användaren bläddrar månader måste SR annonsera den nya månaden:

```html
<div aria-live="polite" aria-atomic="true" class="sr-only" id="month-announce"></div>
```

```js
navigateMonth(direction) {
  // ...navigera...
  document.getElementById("month-announce").textContent =
    `${monthName} ${year}`
}
```

### Kontrast

- Disabled dates med `opacity: 0.3` mot vit bakgrund klarar sannolikt **inte** WCAG AA (4.5:1 för text). Använd en explicit färg istället.
- "In-range" bakgrundsfärg (`#CEE5E4`) mot vit text underkänner. Kontrollera alltid kontrast på varje state.
- Focus-ring: använd `:focus-visible` inte `:focus` — och se till att focus-ringen syns mot alla bakgrundsfärger.

```css
.date-field__day--disabled {
  /* opacity: 0.3 — undviks */
  color: #767676; /* 4.54:1 mot vit — precis godkänt */
  cursor: not-allowed;
}

button:focus-visible {
  outline: 2px solid #3D7A78;
  outline-offset: 2px;
}
```

### Veckonummer är dekorativt för SR

Om du visar veckonummer i gridet — markera dem som dekorativa:

```html
<td role="presentation" aria-hidden="true" class="date-field__week-number">12</td>
```

---

## HTML-strukturen

```html
<div class="date-field" data-min="1900-01-01" data-max="2100-12-31">

  <!-- Äger värdet, postas med formuläret -->
  <input
    type="date"
    class="date-field__native"
    name="birthdate"
    min="1900-01-01"
    max="2100-12-31"
  />

  <!-- Visas på pointer:fine, dold på pointer:coarse -->
  <div class="date-field__desktop" aria-hidden="true">
    <input class="date-field__display" type="text" placeholder="åååå-mm-dd" readonly />
    <button class="date-field__toggle" type="button" aria-label="Välj datum">
      <!-- kalender-ikon -->
    </button>
    <div class="date-field__calendar" role="dialog" aria-modal="true" hidden>
      <div class="date-field__calendar-header">
        <button class="date-field__prev-month" type="button" aria-label="Föregående månad">‹</button>
        <span class="date-field__month-year"></span>
        <button class="date-field__next-month" type="button" aria-label="Nästa månad">›</button>
      </div>
      <div class="date-field__weekdays">
        <!-- Mån Tis Ons Tor Fre Lör Sön -->
      </div>
      <div class="date-field__days">
        <!-- genereras av JS -->
      </div>
    </div>
  </div>

</div>
```

---

## CSS-lagret

```css
/* Mobile: visa native, dölj desktop-UI */
@media (pointer: coarse) {
  .date-field__native {
    display: block; /* synlig, stylad med fernissa */
  }
  .date-field__desktop {
    display: none;
  }
}

/* Desktop: dölj native, visa custom UI */
@media (pointer: fine) {
  .date-field__native {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .date-field__desktop {
    display: block;
  }
}

/* Mobile-fernissa — minimal styling av native input */
.date-field__native {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  border: 1px solid black;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  width: 100%;
}

/* Kalender-popup */
.date-field__calendar {
  position: absolute;
  z-index: 100;
  background: white;
  border: 1px solid black;
  border-radius: 0.5rem;
  padding: 1rem;
}

.date-field__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

/* Dag-states */
.date-field__day--today { font-weight: bold; }
.date-field__day--selected { background: #3D7A78; color: white; }
.date-field__day--disabled { opacity: 0.3; pointer-events: none; }
.date-field__day--outside-month { opacity: 0.4; }
.date-field__day--in-range { background: #CEE5E4; }
```

---

## JS-kärnan

```js
class DateField {
  constructor(el) {
    this.el = el
    this.native = el.querySelector(".date-field__native")
    this.display = el.querySelector(".date-field__display")
    this.calendar = el.querySelector(".date-field__calendar")
    this.min = el.dataset.min ? new Date(el.dataset.min) : null
    this.max = el.dataset.max ? new Date(el.dataset.max) : null
    this.currentMonth = new Date()
    this.selectedDate = null

    this.bindEvents()
  }

  bindEvents() {
    // Toggle kalender
    this.el.querySelector(".date-field__toggle")
      .addEventListener("click", () => this.toggleCalendar())

    // Månad-navigation
    this.el.querySelector(".date-field__prev-month")
      .addEventListener("click", () => this.navigateMonth(-1))
    this.el.querySelector(".date-field__next-month")
      .addEventListener("click", () => this.navigateMonth(1))

    // Stäng vid klick utanför
    document.addEventListener("click", (e) => {
      if (!this.el.contains(e.target)) this.closeCalendar()
    })

    // Form reset
    this.native.form?.addEventListener("reset", () => {
      this.selectedDate = null
      this.display.value = ""
      this.render()
    })

    // Synk om native ändras direkt (t.ex. autofill)
    this.native.addEventListener("change", () => {
      if (this.native.value) {
        this.selectedDate = new Date(this.native.value)
        this.updateDisplay()
      }
    })
  }

  selectDate(date) {
    this.selectedDate = date
    // Skriv alltid yyyy-mm-dd till native
    this.native.value = this.formatISO(date)
    this.updateDisplay()
    this.closeCalendar()
    this.native.dispatchEvent(new Event("change", { bubbles: true }))
  }

  updateDisplay() {
    if (!this.selectedDate) return
    // Display kan vara vilket format som helst
    this.display.value = this.selectedDate.toLocaleDateString("sv-SE", {
      year: "numeric", month: "long", day: "numeric"
    })
  }

  formatISO(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  navigateMonth(direction) {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + direction,
      1
    )
    this.render()
  }

  toggleCalendar() {
    this.calendar.hidden ? this.openCalendar() : this.closeCalendar()
  }

  openCalendar() {
    this.render()
    this.calendar.hidden = false
    this.calendar.removeAttribute("aria-hidden")
  }

  closeCalendar() {
    this.calendar.hidden = true
    this.calendar.setAttribute("aria-hidden", "true")
  }

  render() {
    this.renderHeader()
    this.renderWeekdays()
    this.renderDays()
  }
}
```

---

## Kalender-logik — Edge Cases

### Dagar per månad + skottår

```js
function getDaysInMonth(year, month) {
  // Dag 0 i nästa månad = sista dagen i denna
  return new Date(year, month + 1, 0).getDate()
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}
// Feb 2024: getDaysInMonth(2024, 1) → 29
// Feb 2023: getDaysInMonth(2023, 1) → 28
```

### Vilken veckodag månaden börjar på

```js
function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  // JS: 0=söndag. Sverige: 0=måndag. Konvertera:
  return (day + 6) % 7 // 0=mån, 1=tis, ..., 6=sön
}
// Använd som offset för tomma celler i grid:en
```

### Veckonummer (ISO 8601)

```js
function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // Torsdag i samma vecka avgör veckonummer
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(
    ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  )
}
```

### Min/max som klipper mitt i en månad

```js
function isDayDisabled(date, min, max) {
  if (min && date < min) return true
  if (max && date > max) return true
  return false
}

function isPrevMonthDisabled(currentMonth, min) {
  if (!min) return false
  // Dölj/disabla prev-knappen om vi redan är på min-månaden
  return (
    currentMonth.getFullYear() === min.getFullYear() &&
    currentMonth.getMonth() <= min.getMonth()
  )
}
```

### Disabled dates

```js
// Stöd tre former:
// 1. Enskilda datum: ["2026-12-24", "2026-12-25"]
// 2. Ranges: [{ from: "2026-07-01", to: "2026-07-31" }]
// 3. Veckodagar: { weekdays: [0, 6] } // 0=mån, 6=sön

function isDateDisabled(date, disabledConfig) {
  const iso = formatISO(date)
  const dayOfWeek = (date.getDay() + 6) % 7

  if (disabledConfig.dates?.includes(iso)) return true

  if (disabledConfig.weekdays?.includes(dayOfWeek)) return true

  if (disabledConfig.ranges?.some(r =>
    date >= new Date(r.from) && date <= new Date(r.to)
  )) return true

  return false
}
```

### Keyboard navigation

```js
function handleKeydown(e, focusedDate) {
  const map = {
    ArrowLeft:  -1,         // dag bakåt
    ArrowRight:  1,         // dag framåt
    ArrowUp:    -7,         // vecka bakåt
    ArrowDown:   7,         // vecka framåt
    PageUp:     "prevMonth",
    PageDown:   "nextMonth",
    Home:       "firstOfMonth",
    End:        "lastOfMonth",
    Enter:      "select",
    Escape:     "close",
  }
  // ...implementera navigation baserat på map
}
```

### Fokushantering och ARIA

```html
<div class="date-field__calendar"
     role="dialog"
     aria-modal="true"
     aria-label="Välj datum">

  <div class="date-field__days" role="grid">
    <div role="row">
      <button role="gridcell"
              aria-label="24 mars 2026"
              aria-pressed="true"         <!-- valt datum -->
              aria-disabled="false"
              tabindex="0">               <!-- endast fokuserat datum har tabindex=0 -->
        24
      </button>
    </div>
  </div>
</div>
```

Flytta fokus till kalendern när den öppnas. Returnera fokus till toggle-knappen när den stängs.

### Lokalisering

```js
const locale = "sv-SE"

// Månadsnamn
const monthName = new Intl.DateTimeFormat(locale, { month: "long" })
  .format(new Date(year, month))
// → "mars"

// Veckodagar (kortform, börja på måndag för sv-SE)
function getWeekdayNames(locale) {
  // Vecka som börjar på en känd måndag
  const monday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d)
  })
}
// sv-SE → ["mån", "tis", "ons", "tor", "fre", "lör", "sön"]
```

---

## Gotchas

**Locale-display vs värde**
Native `input[type="date"]` visar alltid i enhetens locale — du kan inte styra det. Custom UI visar vad du vill. Värdet till servern är alltid `yyyy-mm-dd`.

**Surface / iPad med tangentbord**
`pointer: coarse` detekterar touch-kapabilitet, inte om tangentbord är anslutet. En iPad med tangentbord är fortfarande `pointer: coarse` — den får native picker. Det är OK, native på iPad är bra.

**Autofill**
Browsers autofill skriver direkt till `input[type="date"]`. Lyssna på `change`-eventet på native-fältet och synka tillbaka till display.

**Form reset**
Web components och vanilla-element får inte automatisk reset. Lyssna explicit på `form.reset`.

**Timezone**
`new Date("2026-03-24")` tolkas som UTC midnight → kan bli fel datum lokalt. Använd alltid `new Date(year, month, day)` (lokal tid) när du konstruerar datum från delar.

```js
// Fel:
const d = new Date("2026-03-24") // UTC → kan bli 2026-03-23 lokalt

// Rätt:
const d = new Date(2026, 2, 24) // månad är 0-indexed
```

---

## Byta ut kalender-UI:et

Om man inte vill bygga kalender-biten själv — koppla in ett bibliotek mot samma HTML-kontrakt:

**Flatpickr**
```js
flatpickr(nativeInput, {
  disableMobile: false, // native på touch, custom på desktop
  dateFormat: "Y-m-d",
  locale: "sv",
  onChange: ([date]) => updateDisplay(date)
})
```

**Cally** (web component, headless)
```html
<calendar-date value="2026-03-24">
  <calendar-month></calendar-month>
</calendar-date>
```
Full CSS-kontroll, ingen inbyggd styling.

---

## Integration Directions

### Web Component

```js
class DateFieldElement extends HTMLElement {
  connectedCallback() {
    // this.innerHTML = template
    new DateField(this)
  }

  get value() {
    return this.querySelector(".date-field__native").value
  }

  set value(v) {
    this.querySelector(".date-field__native").value = v
  }
}

customElements.define("date-field", DateFieldElement)
```

```html
<date-field name="birthdate" min="1900-01-01"></date-field>
```

### Vue

```vue
<template>
  <div class="date-field" ref="root">
    <!-- samma HTML-struktur -->
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue"

const props = defineProps({ modelValue: String, min: String, max: String })
const emit = defineEmits(["update:modelValue"])
const root = ref(null)
let instance = null

onMounted(() => {
  instance = new DateField(root.value)
  root.value.querySelector(".date-field__native")
    .addEventListener("change", (e) => emit("update:modelValue", e.target.value))
})

watch(() => props.modelValue, (v) => {
  if (instance) instance.selectDate(new Date(v))
})
</script>
```

### React

React och native DOM events är strul — använd `ref` och lyssna manuellt:

```jsx
import { useRef, useEffect } from "react"
import { DateField } from "./date-field.js"

export function DatePicker({ value, onChange, min, max, name }) {
  const ref = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    instanceRef.current = new DateField(ref.current)

    const native = ref.current.querySelector(".date-field__native")
    const handler = (e) => onChange?.(e.target.value)
    native.addEventListener("change", handler)
    return () => native.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    if (value && instanceRef.current) {
      instanceRef.current.selectDate(new Date(value))
    }
  }, [value])

  return (
    <div className="date-field" ref={ref} data-min={min} data-max={max}>
      <input type="date" className="date-field__native" name={name} />
      {/* ... */}
    </div>
  )
}
```

---

*Skapad: 2026-03-24*
