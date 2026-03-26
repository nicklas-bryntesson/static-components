# Custom Time Field — Plan

## Konceptet

Samma grundidé som date-fältet — native på mobil (iOS drum-scroll, Android clock face — båda faktiskt bra), custom UI på desktop där native är oanvändbar.

**Device-detektering**
Identiskt med date-fältet: `window.matchMedia("(pointer: coarse)")`.

**Single source of truth**
Ett dolt `input[type="time"]` äger alltid värdet i `HH:MM`. Custom UI skriver till det. Aldrig tvärtom.

---

## Tillgänglighet — A11y Pitfalls

### `aria-hidden` måste spegla synlighet

`.time-field__desktop` startar med `aria-hidden="true"`. Det måste tas bort på `pointer: fine` — annars ignorerar skärmläsaren hela custom UI:et.

```js
if (window.matchMedia("(pointer: fine)").matches) {
  desktopEl.removeAttribute("aria-hidden")
}
```

### Fieldset legend ska vara meningsfull

```html
<!-- Dåligt — "Välj tid" ger ingen kontext om vilket fält -->
<legend class="sr-only">Välj tid</legend>

<!-- Bra — knyter an till formulärets label -->
<legend class="sr-only">Avgångstid</legend>
```

SR-användaren hör "Avgångstid — Timmar — combobox" när de tabbar in. Utan bra legend hör de bara "Timmar — combobox" utan koppling till vad fältet gäller.

### Select-options behöver enhet för minuter

"00", "15", "30", "45" i isolation är tvetydiga — SR läser upp siffrorna utan kontext.

```js
// Timmar — siffran räcker, "14 timmar" är onödigt
`<option value="${h}">${String(h).padStart(2, "0")}</option>`

// Minuter — lägg till aria-label med enhet
`<option value="${m}" aria-label="${m} minuter">${String(m).padStart(2, "0")}</option>`
```

Alternativt: ge minute-selecten ett tydligt label ("minuter") som ger kontext åt options-listan.

### Live region — bekräfta valt värde

När användaren väljer timme och minut vet de inte att valet registrerades utan feedback. SR annonserar inte automatiskt att native-fältets värde ändrades.

```html
<div aria-live="polite" aria-atomic="true" class="sr-only" id="time-announce"></div>
```

```js
syncToNative() {
  // ...synka värde...
  document.getElementById("time-announce").textContent =
    `Vald tid: ${this.native.value}`
}
```

### Text input auto-advance — SR blir förvirrad

Auto-advance-approachen är den svåraste att göra tillgänglig. SR läser varje tangent-tryck och mellanstegen ("1", "14", "14:3") är meningslösa. Mitigering:

```html
<label for="time-input">Avgångstid</label>
<input
  id="time-input"
  type="text"
  inputmode="numeric"
  autocomplete="off"
  aria-describedby="time-format-hint"
  aria-label="Avgångstid, format timmar minuter"
/>
<span id="time-format-hint" class="sr-only">
  Ange tid med fyra siffror, till exempel 1430 för 14:30
</span>

<!-- Annonsera komplett värde, inte mellansteg -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="time-announce"></div>
```

```js
// Annonsera BARA när värdet är komplett — inte vid varje knapptryck
if (h.length === 2 && m.length === 2) {
  nativeInput.value = `${h}:${m}`
  document.getElementById("time-announce").textContent = `Vald tid: ${h}:${m}`
}
```

### Error states

Native browser-validering ger felmeddelanden automatiskt, men custom UI ger det inte. Koppla explicit:

```html
<fieldset aria-describedby="time-error">
  <!-- selects -->
</fieldset>
<span id="time-error" role="alert" hidden>
  Välj en tid mellan 08:00 och 20:00
</span>
```

```js
function showError(message) {
  const error = document.getElementById("time-error")
  error.textContent = message
  error.hidden = false
  hoursSelect.setAttribute("aria-invalid", "true")
  minutesSelect.setAttribute("aria-invalid", "true")
}

function clearError() {
  document.getElementById("time-error").hidden = true
  hoursSelect.removeAttribute("aria-invalid")
  minutesSelect.removeAttribute("aria-invalid")
}
```

### Disabled options — kommunicera varför

Browsers renderar disabled options med låg kontrast som ofta underkänner WCAG AA. Och SR ger ingen förklaring till varför de är disabled.

```js
// Lägg till kontext i aria-label
`<option value="${h}" disabled aria-label="${h} timmar, utanför tillåtet intervall">
  ${String(h).padStart(2, "0")}
</option>`
```

### Fokusordning

DOM-ordningen avgör tab-ordningen. Timmar → Minuter → AM/PM ska följa logisk ordning:

```html
<!-- Rätt ordning i DOM -->
<select class="time-field__hours">...</select>
<span aria-hidden="true">:</span>
<select class="time-field__minutes">...</select>
<select class="time-field__ampm">...</select> <!-- endast 12h -->
```

Använd aldrig `tabindex > 0` för att manipulera ordningen — det bryter SR-navigering globalt.

### Kontrast

- Disabled options: browsers default ger ofta ~2:1 kontrast. Sätt explicit färg.
- Separator ":" är `aria-hidden` — behöver ingen kontrastregel.
- Focus-ring på selects: `:focus-visible` med tillräcklig offset.

```css
option:disabled {
  color: #767676; /* 4.54:1 mot vit */
}

select:focus-visible {
  outline: 2px solid #3D7A78;
  outline-offset: 2px;
}
```

### `autocomplete` på native-fältet

Sätt ett semantiskt värde om möjligt — det hjälper både SR-användare och alla andra:

```html
<input type="time" autocomplete="off" />         <!-- generell tid -->
<input type="time" name="bst" autocomplete="bday-time" />  <!-- födelsetid -->
```

---

## HTML-strukturen

```html
<div class="time-field" data-min="08:00" data-max="20:00" data-step="15">

  <!-- Äger värdet, postas med formuläret -->
  <input
    type="time"
    class="time-field__native"
    name="departure"
    min="08:00"
    max="20:00"
    step="900"
  />

  <!-- Visas på pointer:fine, dold på pointer:coarse -->
  <div class="time-field__desktop" aria-hidden="true">
    <fieldset class="time-field__selects">
      <legend class="sr-only">Välj tid</legend>

      <div class="time-field__select-wrap">
        <label for="departure-hours" class="sr-only">Timmar</label>
        <select class="time-field__hours" id="departure-hours">
          <!-- genereras av JS -->
        </select>
      </div>

      <span class="time-field__separator" aria-hidden="true">:</span>

      <div class="time-field__select-wrap">
        <label for="departure-minutes" class="sr-only">Minuter</label>
        <select class="time-field__minutes" id="departure-minutes">
          <!-- genereras av JS -->
        </select>
      </div>

      <!-- Endast för 12h-locale -->
      <div class="time-field__ampm-wrap" hidden>
        <select class="time-field__ampm" aria-label="FM/EM">
          <option value="am">FM</option>
          <option value="pm">EM</option>
        </select>
      </div>
    </fieldset>
  </div>

</div>
```

---

## CSS-lagret

```css
/* Identiskt med date-fältet */
@media (pointer: coarse) {
  .time-field__native  { display: block; }
  .time-field__desktop { display: none; }
}

@media (pointer: fine) {
  .time-field__native {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .time-field__desktop { display: block; }
}

/* Fieldset-reset */
.time-field__selects {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.time-field__separator {
  font-size: 1.25rem;
  font-weight: bold;
  line-height: 1;
}

/* Matcha select mot formets form-control */
.time-field__hours,
.time-field__minutes,
.time-field__ampm {
  font-family: inherit;
  font-size: inherit;
  padding: 0.5rem;
  border: 1px solid black;
  border-radius: 0.5rem;
  appearance: none;
  text-align: center;
  cursor: pointer;
}

.time-field__hours   { width: 4rem; }
.time-field__minutes { width: 4rem; }
.time-field__ampm    { width: 5rem; }
```

---

## JS-kärnan

```js
class TimeField {
  constructor(el) {
    this.el = el
    this.native = el.querySelector(".time-field__native")
    this.hours = el.querySelector(".time-field__hours")
    this.minutes = el.querySelector(".time-field__minutes")
    this.ampm = el.querySelector(".time-field__ampm")

    this.min = el.dataset.min || "00:00"
    this.max = el.dataset.max || "23:59"
    this.step = parseInt(el.dataset.step) || 1  // i minuter

    this.use12h = this.detectLocale()

    this.buildOptions()
    this.bindEvents()
    this.syncFromNative()
  }

  buildOptions() {
    const [minH, minM] = this.min.split(":").map(Number)
    const [maxH, maxM] = this.max.split(":").map(Number)

    // Timmar
    const startH = this.use12h ? 1 : 0
    const endH   = this.use12h ? 12 : 23

    this.hours.innerHTML = Array.from({ length: endH - startH + 1 }, (_, i) => {
      const h = startH + i
      const disabled = this.isHourDisabled(h, minH, maxH)
      return `<option value="${h}" ${disabled ? "disabled" : ""}>${String(h).padStart(2, "0")}</option>`
    }).join("")

    // Minuter (respekterar step)
    this.minutes.innerHTML = Array.from(
      { length: Math.ceil(60 / this.step) },
      (_, i) => {
        const m = i * this.step
        return `<option value="${m}">${String(m).padStart(2, "0")}</option>`
      }
    ).join("")

    // AM/PM
    if (this.use12h) {
      this.el.querySelector(".time-field__ampm-wrap").hidden = false
    }
  }

  bindEvents() {
    const sync = () => this.syncToNative()
    this.hours.addEventListener("change", sync)
    this.minutes.addEventListener("change", sync)
    this.ampm?.addEventListener("change", sync)

    // Form reset
    this.native.form?.addEventListener("reset", () => {
      this.syncFromNative()
    })

    // Autofill
    this.native.addEventListener("change", () => this.syncFromNative())
  }

  syncToNative() {
    let h = parseInt(this.hours.value)
    const m = parseInt(this.minutes.value)

    if (this.use12h) {
      const period = this.ampm.value
      if (period === "am" && h === 12) h = 0
      if (period === "pm" && h !== 12) h += 12
    }

    this.native.value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    this.native.dispatchEvent(new Event("change", { bubbles: true }))
  }

  syncFromNative() {
    if (!this.native.value) return
    const [h, m] = this.native.value.split(":").map(Number)

    if (this.use12h) {
      const period = h >= 12 ? "pm" : "am"
      const displayH = h % 12 || 12
      this.hours.value = displayH
      this.ampm.value = period
    } else {
      this.hours.value = h
    }

    // Snap till närmaste steg
    const snappedMinute = Math.round(m / this.step) * this.step % 60
    this.minutes.value = snappedMinute
  }

  detectLocale() {
    // Kolla om locale använder 12h eller 24h
    const formatted = new Intl.DateTimeFormat(navigator.language, {
      hour: "numeric"
    }).format(new Date(2000, 0, 1, 13))
    return formatted.includes("1") && !formatted.includes("13")
  }
}
```

---

## Edge Cases

### `step`-attributet räknas i sekunder

```html
<!-- Native input — step i sekunder -->
<input type="time" step="900" />   <!-- 15 min -->
<input type="time" step="1800" />  <!-- 30 min -->
<input type="time" step="3600" />  <!-- 1 timme -->
```

```js
// data-step i minuter för läsbarhet, konvertera till sekunder för native
el.querySelector(".time-field__native").step = this.step * 60
```

Browser validerar att värdet är på en step-boundary. Om step=900 och värdet är 08:07 får du ett valideringsfel.

### 24h vs 12h locale

```js
// Detecta via Intl — pålitligare än navigator.language direkt
function is12HourLocale(locale = navigator.language) {
  const sample = new Intl.DateTimeFormat(locale, { hour: "numeric" })
    .format(new Date(2000, 0, 1, 13))
  // 24h → "13", 12h → "1 PM" eller liknande
  return !sample.startsWith("13")
}
// sv-SE → false (24h)
// en-US → true (12h)
```

AM/PM-konvertering:
```js
// Display → 24h för native
function to24h(h, period) {
  if (period === "am") return h === 12 ? 0 : h
  if (period === "pm") return h === 12 ? 12 : h + 12
}

// 24h → display
function to12h(h24) {
  return {
    hours: h24 % 12 || 12,
    period: h24 >= 12 ? "pm" : "am"
  }
}
```

### Min/max som klipper timmar och minuter

```js
function isHourDisabled(hour, minH, maxH) {
  return hour < minH || hour > maxH
}

// Minuter beror på vilken timme som är vald
function isMinuteDisabled(minute, selectedHour, min, max) {
  const [minH, minM] = min.split(":").map(Number)
  const [maxH, maxM] = max.split(":").map(Number)

  if (selectedHour === minH && minute < minM) return true
  if (selectedHour === maxH && minute > maxM) return true
  return false
}

// När timme byts — uppdatera vilka minuter som är disabled
this.hours.addEventListener("change", () => {
  this.updateMinuteConstraints()
  this.syncToNative()
})
```

### Midnatt och dag-övergång

`input[type="time"]` har **inget** stöd för "wrap around". Min/max som korsar midnatt fungerar inte i native:

```html
<!-- Fungerar INTE — native vet inte att du menar nästa dag -->
<input type="time" min="22:00" max="02:00" />
```

Lösning: om du behöver spanna över midnatt, använd `datetime-local` istället, eller hantera det som två separata tidsintervall i JS.

### Snap till närmaste step vid fri input

Om användaren skriver ett värde som inte är på en step-boundary, snappa till närmaste:

```js
function snapToStep(minutes, step) {
  return Math.round(minutes / step) * step % 60
}
// snapToStep(7, 15)  → 0
// snapToStep(8, 15)  → 15
// snapToStep(22, 15) → 15
```

### Timezone

`input[type="time"]` har **inget** timezone-koncept — det är alltid lokal tid. Om du behöver UTC-hantering måste du konvertera manuellt:

```js
function localTimeToUTC(timeString) {
  const [h, m] = timeString.split(":").map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}
```

### Keyboard i select

Native `<select>` ger keyboard-navigation gratis. Men om du vill bygga custom dropdown (scroll-wheel/drum) måste du implementera:
- `ArrowUp` / `ArrowDown` — stega upp/ner
- Sifferinput — typ "1", "4" → hoppa till 14
- `Tab` — hoppa från timmar till minuter

Det är anledningen till att two-selects-approachen faktiskt är solid — du får keyboard gratis.

### Display-format vs value

```js
// Value till native: alltid "HH:MM"
native.value = "14:30"

// Display för användaren: vad du vill
const display = new Intl.DateTimeFormat("sv-SE", {
  hour: "2-digit",
  minute: "2-digit"
}).format(new Date(2000, 0, 1, 14, 30))
// → "14:30" (sv-SE är alltid 24h)
```

---

## Custom UI — tre nivåer

Vilket UI som är rätt beror på `step` och kontext:

| Approach | Passar när | Keyboard | ARIA-arbete |
|---|---|---|---|
| **Two selects** | Få, fasta alternativ (step ≥ 15) | Gratis | Minimalt |
| **Text input med auto-advance** | Generellt, valfri minut | Gratis | Minimalt |
| **Scroll-wheel/drum** | Touch-inspirerat, bokningssystem | Bygg själv | Mer jobb |

### Two selects

Pragmatisk. Med step ≥ 15 är det max 4-8 options i minuter — snabbt och tydligt. Med step 1 (60 options) är det dålig UX.

### Text input med auto-advance ✓ Rekommenderas för generellt bruk

Användaren skriver direkt — snabbt, tangentbordsdrivet, inga dropdowns:

```
Trycker "1"  → "1_:__"
Trycker "4"  → "14:__"
Trycker "3"  → "14:3_"
Trycker "0"  → "14:30" ✓ — skriver till native, dispatch change
```

```js
function handleTimeInput(e, nativeInput) {
  const raw = e.target.value.replace(/\D/g, "")  // bara siffror

  let h = raw.slice(0, 2)
  let m = raw.slice(2, 4)

  // Validera timme
  if (h.length === 2 && parseInt(h) > 23) h = "23"

  // Validera minut
  if (m.length === 2 && parseInt(m) > 59) m = "59"

  // Auto-advance: om första siffran > 2, hoppa direkt till minuter
  if (raw.length === 1 && parseInt(raw[0]) > 2) {
    h = `0${raw[0]}`
    // flytta fokus till minuter
  }

  // Formatera display
  e.target.value = m.length
    ? `${h.padStart(2, "0")}:${m.padStart(2, "0")}`
    : h

  // Skriv till native när komplett
  if (h.length === 2 && m.length === 2) {
    nativeInput.value = `${h}:${m}`
    nativeInput.dispatchEvent(new Event("change", { bubbles: true }))
  }
}
```

Gotchas för text input:
- **Paste** — hantera `"1430"`, `"14:30"` och `"2:30 PM"` — normalisera alla
- **Backspace** — ta bort karaktär-för-karaktär, hoppa tillbaka från minuter till timmar
- **Blur** — snap till närmaste giltiga step, rensa ogiltiga värden
- **12h input** — "2:30 PM" ska bli "14:30" i native

### Scroll-wheel/drum

Visuellt tilltalande men mest jobb. Bygg med `touch`/`wheel`-events eller använd Flatpickr.

---

## Gotchas

**`step` validering**
Browser validerar mot step i native-fältet. Snappa alltid värdet före du skriver till native.

**Tomma minuter-options vid step-snap**
Om du byter timme och nuvarande minuter inte är valid med constraints — sätt till närmaste tillåtna minut automatiskt, annars postar du ett invalid värde.

**Seconds i value**
Om `step < 60` returnerar native-fältet `HH:MM:SS`. Hantera eller strippa sekunder beroende på behov.

**Form reset**
Samma som date — lyssna explicit på `form.reset`.

**Autofill**
Ovanligt för tid men kan hända i t.ex. bokningsformulär. Lyssna på `change` på native och synka tillbaka.

---

## Byta ut custom UI:et

Two-selects är default. Om man vill ha scroll-wheel/drum istället:

**Flatpickr** (stödjer tid)
```js
flatpickr(nativeInput, {
  enableTime: true,
  noCalendar: true,
  disableMobile: false, // native på touch
  time_24hr: !is12HourLocale(),
  minuteIncrement: 15,
  dateFormat: "H:i",
})
```

**Ingen bra headless time-picker finns** i dagsläget — du bygger antingen med Flatpickr eller roll your own scroll-wheel.

---

## Integration Directions

### Web Component

```js
class TimeFieldElement extends HTMLElement {
  connectedCallback() {
    new TimeField(this)
  }

  get value() {
    return this.querySelector(".time-field__native").value
  }

  set value(v) {
    this.querySelector(".time-field__native").value = v
    // trigga synk tillbaka till selects
    this.querySelector(".time-field__native")
      .dispatchEvent(new Event("change"))
  }
}

customElements.define("time-field", TimeFieldElement)
```

```html
<time-field name="departure" min="08:00" max="20:00" data-step="15"></time-field>
```

### Vue

```vue
<script setup>
import { ref, onMounted, watch } from "vue"
import { TimeField } from "./time-field.js"

const props = defineProps({ modelValue: String, min: String, max: String, step: Number })
const emit = defineEmits(["update:modelValue"])
const root = ref(null)

onMounted(() => {
  new TimeField(root.value)
  root.value.querySelector(".time-field__native")
    .addEventListener("change", (e) => emit("update:modelValue", e.target.value))
})

watch(() => props.modelValue, (v) => {
  if (!root.value) return
  const native = root.value.querySelector(".time-field__native")
  native.value = v
  native.dispatchEvent(new Event("change"))
})
</script>
```

### React

```jsx
import { useRef, useEffect } from "react"
import { TimeField } from "./time-field.js"

export function TimePicker({ value, onChange, min, max, step = 15, name }) {
  const ref = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    instanceRef.current = new TimeField(ref.current)
    const native = ref.current.querySelector(".time-field__native")
    const handler = (e) => onChange?.(e.target.value)
    native.addEventListener("change", handler)
    return () => native.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    if (!value || !ref.current) return
    const native = ref.current.querySelector(".time-field__native")
    native.value = value
    native.dispatchEvent(new Event("change"))
  }, [value])

  return (
    <div className="time-field" ref={ref}
         data-min={min} data-max={max} data-step={step}>
      <input type="time" className="time-field__native"
             name={name} step={step * 60} />
      {/* ... */}
    </div>
  )
}
```

---

*Skapad: 2026-03-24*
