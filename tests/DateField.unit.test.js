import { describe, it, expect } from 'vitest'
import {
  getDaysInMonth,
  getFirstWeekdayOfMonth,
  getISOWeek,
  isDayDisabled,
  formatISO,
  getWeekdayNames,
  getMonthName,
} from '../src/partials/components/DateField/DateField.js'
import DateField from '../src/partials/components/DateField/DateField.js'

describe('getDaysInMonth', () => {
  it('returns 29 for Feb in leap year 2024', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29)
  })
  it('returns 28 for Feb in non-leap year 2023', () => {
    expect(getDaysInMonth(2023, 1)).toBe(28)
  })
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31)
  })
  it('returns 30 for April', () => {
    expect(getDaysInMonth(2026, 3)).toBe(30)
  })
})

describe('getFirstWeekdayOfMonth', () => {
  it('returns 6 for March 2026 (starts Sunday, Monday-first grid)', () => {
    expect(getFirstWeekdayOfMonth(2026, 2)).toBe(6)
  })
  it('returns 3 for January 2026 (starts Thursday)', () => {
    expect(getFirstWeekdayOfMonth(2026, 0)).toBe(3)
  })
})

describe('getISOWeek', () => {
  it('returns 1 for Jan 4 2026 (always in week 1)', () => {
    expect(getISOWeek(new Date(2026, 0, 4))).toBe(1)
  })
  it('returns 53 for Dec 28 2020', () => {
    expect(getISOWeek(new Date(2020, 11, 28))).toBe(53)
  })
})

describe('isDayDisabled', () => {
  const min = new Date(2026, 0, 10)
  const max = new Date(2026, 0, 20)
  it('disables dates before min', () => {
    expect(isDayDisabled(new Date(2026, 0, 9), min, max)).toBe(true)
  })
  it('disables dates after max', () => {
    expect(isDayDisabled(new Date(2026, 0, 21), min, max)).toBe(true)
  })
  it('allows dates within range', () => {
    expect(isDayDisabled(new Date(2026, 0, 15), min, max)).toBe(false)
  })
  it('allows min date itself', () => {
    expect(isDayDisabled(new Date(2026, 0, 10), min, max)).toBe(false)
  })
  it('allows max date itself', () => {
    expect(isDayDisabled(new Date(2026, 0, 20), min, max)).toBe(false)
  })
  it('allows all dates when no min/max', () => {
    expect(isDayDisabled(new Date(2026, 0, 1), null, null)).toBe(false)
  })
})

describe('formatISO', () => {
  it('formats to yyyy-mm-dd', () => {
    expect(formatISO(new Date(2026, 2, 5))).toBe('2026-03-05')
  })
  it('pads single-digit month and day', () => {
    expect(formatISO(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})

describe('getWeekdayNames', () => {
  it('returns 7-element array for sv-SE', () => {
    expect(getWeekdayNames('sv-SE')).toHaveLength(7)
  })
  it('starts with Monday for sv-SE (first char is m)', () => {
    const names = getWeekdayNames('sv-SE')
    expect(names[0].toLowerCase()).toMatch(/^m/)
  })
  it('returns 7-element array for en', () => {
    expect(getWeekdayNames('en')).toHaveLength(7)
  })
})

describe('getMonthName', () => {
  it('returns "mars" for month index 2 in sv-SE', () => {
    expect(getMonthName(2026, 2, 'sv-SE')).toBe('mars')
  })
  it('returns "March" for month index 2 in en', () => {
    expect(getMonthName(2026, 2, 'en')).toBe('March')
  })
})

describe('DateField.registerLocale', () => {
  it('registers and retrieves a locale', () => {
    DateField.registerLocale('test-locale', { day: 'Dag' })
    expect(DateField.translations['test-locale'].day).toBe('Dag')
  })
  it('overwrites an existing locale', () => {
    DateField.registerLocale('test-locale', { day: 'Day' })
    expect(DateField.translations['test-locale'].day).toBe('Day')
  })
})

describe('timezone safety', () => {
  it('new Date(y, m, d) produces correct local date — not UTC-shifted', () => {
    const d = new Date(2026, 2, 24) // March 24 2026 local midnight
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2)
    expect(d.getDate()).toBe(24)
  })
})

describe('DateField locale resolution', () => {
  it('falls back to en when resolved locale has no registered translation', () => {
    // 'fr' is not registered — should fall back to en
    const el = document.createElement('div')
    el.innerHTML = `
      <input class="Native" id="t1" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    el.dataset.component = 'DateField'
    el.dataset.locale = 'fr'
    document.body.appendChild(el)
    const instance = new DateField(el)
    expect(instance.locale).toBe('en')
    el.remove()
  })

  it('uses data-locale when set and registered', () => {
    const el = document.createElement('div')
    el.innerHTML = `
      <input class="Native" id="t2" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    el.dataset.component = 'DateField'
    el.dataset.locale = 'sv-SE'
    DateField.registerLocale('sv-SE', { day: 'Dag', month: 'Månad', year: 'År', openCalendar: 'Öppna kalender', closeCalendar: 'Stäng kalender', prevMonth: 'Föregående månad', nextMonth: 'Nästa månad', today: 'idag', selected: 'valt', notAvailable: 'ej tillgängligt', announceSelected: 'Valt datum:' })
    document.body.appendChild(el)
    const instance = new DateField(el)
    expect(instance.locale).toBe('sv-SE')
    expect(instance.t.day).toBe('Dag')
    el.remove()
  })

  it('falls back to document.documentElement.lang when data-locale is absent', () => {
    document.documentElement.lang = 'sv-SE'
    const el = document.createElement('div')
    el.innerHTML = `
      <input class="Native" id="t3" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    el.dataset.component = 'DateField'
    document.body.appendChild(el)
    const instance = new DateField(el)
    expect(instance.locale).toBe('sv-SE')
    document.documentElement.lang = ''
    el.remove()
  })
})

describe('registerLocale fallback', () => {
  it('falls back to en strings when locale is not registered', () => {
    // Confirm that a component using an unregistered locale uses en strings
    const el = document.createElement('div')
    el.innerHTML = `
      <input class="Native" id="t4" type="date" />
      <div class="Custom" aria-hidden="true">
        <div class="Segments" role="group"></div>
        <button class="Trigger" type="button"></button>
        <template data-template="datefield-calendar"></template>
      </div>
      <div class="Announce" aria-live="polite" aria-atomic="true"></div>
    `
    el.dataset.component = 'DateField'
    el.dataset.locale = 'de' // not registered
    document.body.appendChild(el)
    const instance = new DateField(el)
    expect(instance.t.openCalendar).toBe('Open calendar') // en value
    el.remove()
  })
})

// ─── Shared fixture helper ────────────────────────────────────────────────────
function makeField({ disabled = false, value = '', min = '', max = '', locale = 'sv-SE', id } = {}) {
  const inputId = id ?? `df-test-${Math.random().toString(36).slice(2)}`
  const el = document.createElement('div')
  el.dataset.component = 'DateField'
  el.dataset.locale = locale
  if (min) { el.dataset.min = min }
  if (max) { el.dataset.max = max }
  el.innerHTML = `
    <input class="Native" id="${inputId}" type="date"
      ${value    ? `value="${value}"`  : ''}
      ${min      ? `min="${min}"`      : ''}
      ${max      ? `max="${max}"`      : ''}
      ${disabled ? 'disabled'          : ''}
    />
    <label for="${inputId}">Test label</label>
    <div class="Custom" aria-hidden="true">
      <div class="Segments" role="group">
        <span class="Segment" role="spinbutton" aria-label="Dag"
          aria-valuemin="1" aria-valuemax="31" aria-valuetext="dd"
          tabindex="0" data-segment="day" data-placeholder>dd</span>
        <span class="Separator" aria-hidden="true">/</span>
        <span class="Segment" role="spinbutton" aria-label="Månad"
          aria-valuemin="1" aria-valuemax="12" aria-valuetext="mm"
          tabindex="-1" data-segment="month" data-placeholder>mm</span>
        <span class="Separator" aria-hidden="true">/</span>
        <span class="Segment" role="spinbutton" aria-label="År"
          aria-valuemin="1900" aria-valuemax="2100" aria-valuetext="yyyy"
          tabindex="-1" data-segment="year" data-placeholder>yyyy</span>
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

describe('DateField — initial value sync', () => {
  it('populates segments from native value attribute on mount', () => {
    const { el } = makeField({ value: '1990-06-15' })
    expect(el.querySelector('[data-segment="day"]').getAttribute('aria-valuenow')).toBe('15')
    expect(el.querySelector('[data-segment="month"]').getAttribute('aria-valuenow')).toBe('6')
    expect(el.querySelector('[data-segment="year"]').getAttribute('aria-valuenow')).toBe('1990')
    el.remove()
  })

  it('sets selectedDate from native value on mount', () => {
    const { el, instance } = makeField({ value: '1990-06-15' })
    expect(instance.selectedDate).not.toBeNull()
    expect(instance.selectedDate.getFullYear()).toBe(1990)
    expect(instance.selectedDate.getMonth()).toBe(5) // June is month index 5
    expect(instance.selectedDate.getDate()).toBe(15)
    el.remove()
  })

  it('leaves segments as placeholders when no initial value', () => {
    const { el } = makeField()
    expect(el.querySelector('[data-segment="day"]').hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })

  it('populates segments from initial value even when field is disabled', () => {
    const { el } = makeField({ disabled: true, value: '1990-06-15' })
    expect(el.querySelector('[data-segment="day"]').getAttribute('aria-valuenow')).toBe('15')
    expect(el.querySelector('[data-segment="year"]').getAttribute('aria-valuenow')).toBe('1990')
    el.remove()
  })
})

describe('DateField — disabled state', () => {
  it('sets all segments to tabindex="-1" when native is disabled', () => {
    const { el } = makeField({ disabled: true })
    el.querySelectorAll('.Segment').forEach(seg => {
      expect(seg.getAttribute('tabindex')).toBe('-1')
    })
    el.remove()
  })

  it('does not increment a segment when native is disabled', () => {
    const { el } = makeField({ disabled: true })
    const daySeg = el.querySelector('[data-segment="day"]')
    daySeg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(daySeg.hasAttribute('data-placeholder')).toBe(true)
    el.remove()
  })

  it('disables the calendar trigger button when native is disabled', () => {
    const { el, instance } = makeField({ disabled: true })
    expect(instance.trigger.disabled).toBe(true)
    el.remove()
  })
})
