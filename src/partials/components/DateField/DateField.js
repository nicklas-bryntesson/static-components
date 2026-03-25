// src/partials/components/DateField/DateField.js

// ─── Date helpers (exported for testing) ─────────────────────────────────────

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstWeekdayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7 // 0=Mon, 6=Sun
}

export function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(
    ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  )
}

export function isDayDisabled(date, min, max) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (min) {
    const minDay = new Date(min.getFullYear(), min.getMonth(), min.getDate())
    if (d < minDay) return true
  }
  if (max) {
    const maxDay = new Date(max.getFullYear(), max.getMonth(), max.getDate())
    if (d > maxDay) return true
  }
  return false
}

export function formatISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekdayNames(locale) {
  const monday = new Date(2024, 0, 1) // known Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
  })
}

export function getMonthName(year, month, locale) {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month, 1))
}

// ─── DateField class ──────────────────────────────────────────────────────────

class DateField {
  static instanceCount = 0
  static translations = {
    en: {
      day: 'Day', month: 'Month', year: 'Year',
      openCalendar: 'Open calendar', closeCalendar: 'Close calendar',
      prevMonth: 'Previous month', nextMonth: 'Next month',
      today: 'today', selected: 'selected', notAvailable: 'not available',
      announceSelected: 'Selected date:',
    }
  }

  static registerLocale(locale, strings) {
    // Merge against en defaults so partial objects don't produce undefined keys at render time
    DateField.translations[locale] = { ...DateField.translations.en, ...strings }
  }

  static attach(parent = document) {
    parent.querySelectorAll('[data-component="DateField"]').forEach(el => {
      if (el.__dateFieldInstance) return
      el.__dateFieldInstance = new DateField(el)
    })
  }

  constructor(el) {
    this.root = el
    this.instanceId = ++DateField.instanceCount
    this.native = el.querySelector('.Native')
    this.custom = el.querySelector('.Custom')
    this.segments = el.querySelector('.Segments')
    this.trigger = el.querySelector('.Trigger')
    this.announce = el.querySelector('.Announce')
    this.calendarTemplate = el.querySelector('[data-template="datefield-calendar"]')

    this.calendarEl = null
    this.selectedDate = null
    this.currentYear = new Date().getFullYear()
    this.currentMonth = new Date().getMonth()
    this._syncingFromCustom = false

    this.min = el.dataset.min ? this._parseDate(el.dataset.min) : null
    this.max = el.dataset.max ? this._parseDate(el.dataset.max) : null

    this.locale = this._resolveLocale()
    this.t = DateField.translations[this.locale] ?? DateField.translations['en']

    this._init()
  }

  _resolveLocale() {
    const loc = this.root.dataset.locale
      || document.documentElement.lang
      || 'en'
    return DateField.translations[loc] ? loc : 'en'
  }

  _parseDate(isoString) {
    const [y, m, d] = isoString.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  _init() {
    // stub — full implementation in Tasks 5-8
  }

  destroy() {
    if (this.calendarEl) this.calendarEl.remove()
    delete this.root.__dateFieldInstance
  }
}

export default DateField
