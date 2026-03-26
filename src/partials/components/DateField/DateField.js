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
  const monday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
  })
}

export function getMonthName(year, month, locale) {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month, 1))
}

export function getSegmentOrder(locale) {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(2026, 0, 15))

    const order = []
    let separator = '/'

    for (const part of parts) {
      if (part.type === 'day' || part.type === 'month' || part.type === 'year') {
        order.push(part.type)
      } else if (part.type === 'literal' && order.length > 0 && order.length < 3) {
        const stripped = part.value.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '').trim()
        if (stripped) separator = stripped
      }
    }

    if (order.length === 3) return { order, separator }
  } catch (_) {}

  return { order: ['day', 'month', 'year'], separator: '/' }
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
    this._segmentEls = []
    this._digitBuffer = ''
    this._digitTimer = null
    this._outsideClickHandler = null

    this._handleTriggerClick = () => this._toggleCalendar()
    this._handleNativeChange = () => {
      if (this._syncingFromCustom) return
      if (!this.native.value) return
      const [y, m, d] = this.native.value.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      this.selectedDate = date
      this._setSegmentValue(this._getSegmentEl('day'), d)
      this._setSegmentValue(this._getSegmentEl('month'), m)
      this._setSegmentValue(this._getSegmentEl('year'), y)
    }
    this._handleFormReset = () => {
      this.selectedDate = null
      this._segmentEls.forEach(seg => this._clearSegment(seg))
    }

    this.min = el.dataset.min ? this._parseDate(el.dataset.min) : null
    this.max = el.dataset.max ? this._parseDate(el.dataset.max) : null

    this.locale = this._resolveLocale()
    this.t = DateField.translations[this.locale] ?? DateField.translations['en']

    this._init()
  }

  _resolveLocale() {
    const loc = this.root.dataset.locale || document.documentElement.lang || 'en'
    return DateField.translations[loc] ? loc : 'en'
  }

  _parseDate(isoString) {
    const [y, m, d] = isoString.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

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

  _initInteractive() {
    this.root.dataset.inputMode = 'custom'
    this.custom.removeAttribute('aria-hidden')

    // Connect field label via aria-labelledby → <label for="..."> or aria-label fallback
    const labelEl = this.native?.id
      ? document.querySelector(`label[for="${this.native.id}"]`)
      : null
    if (labelEl) {
      if (!labelEl.id) labelEl.id = `datefield-label-${this.instanceId}`
      this.segments.setAttribute('aria-labelledby', labelEl.id)
    } else if (this.root.dataset.labelField) {
      this.segments.setAttribute('aria-label', this.root.dataset.labelField)
    }

    if (this.native.disabled) this.root.dataset.disabled = ''
    this._buildSegments()
    this._bindSegmentEvents()
    this._bindTrigger()
    if (!this.native.disabled) {
      this._bindValueSync()
      this._bindFormReset()
    }
    this._syncInitialValue()
  }

  destroy() {
    if (this.calendarEl) this.calendarEl.remove()
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler)
    }

    // Remove trigger listener
    this.trigger?.removeEventListener('click', this._handleTriggerClick)

    // Remove native change listener
    this.native?.removeEventListener('change', this._handleNativeChange)

    // Remove form reset listener
    if (this.native?.form && this._handleFormReset) {
      this.native.form.removeEventListener('reset', this._handleFormReset)
    }

    // Remove segment listeners
    this._segmentEls.forEach(seg => {
      const handlers = seg.__dateFieldHandlers
      if (handlers) {
        seg.removeEventListener('keydown', handlers.keydown)
        seg.removeEventListener('focus', handlers.focus)
        seg.removeEventListener('blur', handlers.blur)
        delete seg.__dateFieldHandlers
      }
    })

    // Restore aria-hidden on .Custom
    this.custom?.setAttribute('aria-hidden', 'true')

    delete this.root.__dateFieldInstance
  }

  // ─── Segments ───────────────────────────────────────────────────────────────

  _createSegmentEl(type) {
    const span = document.createElement('span')
    span.className = 'Segment'
    span.setAttribute('role', 'spinbutton')
    span.setAttribute('aria-label', this.t[type] || type)
    span.setAttribute('data-segment', type)
    span.setAttribute('data-placeholder', '')
    span.setAttribute('tabindex', '-1') // first segment will be set to 0 after all are inserted

    const limits = this._getSegmentLimits(type)
    span.setAttribute('aria-valuemin', limits.min)
    span.setAttribute('aria-valuemax', limits.max)

    const placeholder = type === 'day' ? 'dd' : type === 'month' ? 'mm' : 'yyyy'
    span.setAttribute('aria-valuetext', placeholder)
    span.textContent = placeholder

    return span
  }

  _buildSegments() {
    // Remove any pre-existing segment spans and separators (handles legacy HTML templates)
    this.segments.querySelectorAll('.Segment, .Separator').forEach(el => el.remove())

    // Determine segment order and separator from locale
    const { order, separator } = getSegmentOrder(this.locale)

    // Generate and insert segments + separators before the trigger button
    order.forEach((type, i) => {
      this.trigger.before(this._createSegmentEl(type))
      if (i < order.length - 1) {
        const sep = document.createElement('span')
        sep.className = 'Separator'
        sep.setAttribute('aria-hidden', 'true')
        sep.textContent = separator
        this.trigger.before(sep)
      }
    })

    // Collect generated segment elements and set up roving tabindex
    this._segmentEls = [...this.segments.querySelectorAll('[data-segment]')]
    if (this._segmentEls.length > 0) {
      this._segmentEls[0].setAttribute('tabindex', '0')
    }

    // Disabled: make all segments non-focusable
    if (this.native.disabled) {
      this._segmentEls.forEach(seg => seg.setAttribute('tabindex', '-1'))
    }
  }

  _bindSegmentEvents() {
    this._segmentEls.forEach(seg => {
      const keydownHandler = e => this._handleSegmentKey(e, seg)
      const focusHandler = () => this._setSegmentFocused(seg)
      const blurHandler = () => seg.removeAttribute('data-focused')
      seg.__dateFieldHandlers = { keydown: keydownHandler, focus: focusHandler, blur: blurHandler }
      seg.addEventListener('keydown', keydownHandler)
      seg.addEventListener('focus', focusHandler)
      seg.addEventListener('blur', blurHandler)
    })
  }

  _initDisplay() {
    this.root.dataset.inputMode = 'display'
    if (this.native.disabled) this.root.dataset.disabled = ''

    this._buildSegments()

    // Display segments are not interactive — override roving tabindex
    this._segmentEls.forEach(seg => seg.setAttribute('tabindex', '-1'))

    // Keep segments updated when native value changes (autofill, programmatic)
    this.native.addEventListener('change', this._handleNativeChange)
    this.native.form?.addEventListener('reset', this._handleFormReset)

    // Sync initial native value to segment display
    if (this.native.value) this._syncInitialValue()
  }

  _setSegmentFocused(seg) {
    this._segmentEls.forEach(s => {
      s.removeAttribute('data-focused')
      s.setAttribute('tabindex', '-1')
    })
    seg.setAttribute('data-focused', '')
    seg.setAttribute('tabindex', '0')
  }

  _handleSegmentKey(e, seg) {
    if (this.native.disabled) return
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        this._incrementSegment(seg, 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        this._incrementSegment(seg, -1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        this._moveSegmentFocus(seg, -1)
        break
      case 'ArrowRight':
        e.preventDefault()
        this._moveSegmentFocus(seg, 1)
        break
      case 'Backspace':
        e.preventDefault()
        this._clearSegment(seg)
        this._moveSegmentFocus(seg, -1)
        break
      case 'Escape':
        if (this.calendarEl) { e.preventDefault(); this._closeCalendar() }
        break
      default:
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault()
          this._handleDigit(seg, e.key)
        }
    }
  }

  _moveSegmentFocus(current, direction) {
    const idx = this._segmentEls.indexOf(current)
    const next = this._segmentEls[idx + direction]
    if (next) { this._setSegmentFocused(next); next.focus() }
  }

  _getCurrentSegmentValue(seg) {
    return seg.hasAttribute('data-placeholder') ? null : Number(seg.getAttribute('aria-valuenow'))
  }

  _getSegmentEl(type) {
    return this._segmentEls.find(s => s.dataset.segment === type) ?? null
  }

  _getSegmentValueByType(type) {
    const seg = this._getSegmentEl(type)
    return seg ? this._getCurrentSegmentValue(seg) : null
  }

  _getSegmentLimits(type) {
    if (type === 'day') {
      const year = this._getSegmentValueByType('year') ?? new Date().getFullYear()
      const month = this._getSegmentValueByType('month')
      const daysInMonth = month != null ? getDaysInMonth(year, month - 1) : 31
      return { min: 1, max: daysInMonth }
    }
    if (type === 'month') return { min: 1, max: 12 }
    // year — respect data-min / data-max when set
    return {
      min: this.min ? this.min.getFullYear() : 1900,
      max: this.max ? this.max.getFullYear() : 2100,
    }
  }

  _incrementSegment(seg, delta) {
    const type = seg.dataset.segment
    const current = this._getCurrentSegmentValue(seg)
    const limits = this._getSegmentLimits(type)
    const start = current ?? (delta > 0 ? limits.min - 1 : limits.max + 1)
    let next = start + delta
    if (next > limits.max) next = limits.min
    if (next < limits.min) next = limits.max
    this._setSegmentValue(seg, next)
  }

  _setSegmentValue(seg, numericValue) {
    const type = seg.dataset.segment
    seg.removeAttribute('data-placeholder')
    seg.setAttribute('aria-valuenow', numericValue)

    if (type === 'month') {
      const year = this._getSegmentValueByType('year') ?? new Date().getFullYear()
      seg.setAttribute('aria-valuetext', getMonthName(year, numericValue - 1, this.locale))
      seg.textContent = String(numericValue).padStart(2, '0')
      // Keep day aria-valuemax in sync — February has 28/29 days, not 31
      const daySeg = this._getSegmentEl('day')
      if (daySeg) {
        const daysInMonth = getDaysInMonth(year, numericValue - 1)
        daySeg.setAttribute('aria-valuemax', daysInMonth)
      }
    } else if (type === 'day') {
      seg.setAttribute('aria-valuetext', numericValue)
      seg.textContent = String(numericValue).padStart(2, '0')
      // Keep aria-valuemax in sync when month/year changes
      const limits = this._getSegmentLimits('day')
      seg.setAttribute('aria-valuemax', limits.max)
    } else {
      seg.setAttribute('aria-valuetext', numericValue)
      seg.textContent = numericValue
    }
    this._trySyncToNative()
  }

  _clearSegment(seg) {
    const type = seg.dataset.segment
    seg.setAttribute('data-placeholder', '')
    seg.removeAttribute('aria-valuenow')
    const placeholder = type === 'day' ? 'dd' : type === 'month' ? 'mm' : 'yyyy'
    seg.setAttribute('aria-valuetext', placeholder)
    seg.textContent = placeholder
  }

  _handleDigit(seg, digit) {
    const type = seg.dataset.segment
    clearTimeout(this._digitTimer)
    this._digitBuffer += digit
    const num = Number(this._digitBuffer)

    if (type === 'day') {
      if (num > 3) {
        this._setSegmentValue(seg, num)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      } else if (this._digitBuffer.length === 2) {
        const clamped = Math.min(num, this._getSegmentLimits('day').max)
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      } else {
        this._digitTimer = setTimeout(() => {
          this._setSegmentValue(seg, num)
          this._digitBuffer = ''
          this._moveSegmentFocus(seg, 1)
        }, 1000)
      }
    } else if (type === 'month') {
      if (num > 1) {
        this._setSegmentValue(seg, num)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      } else if (this._digitBuffer.length === 2) {
        const clamped = Math.max(1, Math.min(num, 12))
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      } else {
        this._digitTimer = setTimeout(() => {
          this._setSegmentValue(seg, Math.max(1, num))
          this._digitBuffer = ''
          this._moveSegmentFocus(seg, 1)
        }, 1000)
      }
    } else if (type === 'year') {
      if (this._digitBuffer.length === 4) {
        const limits = this._getSegmentLimits('year')
        const clamped = Math.max(limits.min, Math.min(limits.max, num))
        this._setSegmentValue(seg, clamped)
        this._digitBuffer = ''
        this._moveSegmentFocus(seg, 1)
      }
    }
  }

  _bindTrigger() {
    this.trigger.setAttribute('aria-label', this.t.openCalendar)
    if (this.native.disabled) {
      this.trigger.disabled = true
      return
    }
    this.trigger.addEventListener('click', this._handleTriggerClick)
  }

  // ─── Value sync ─────────────────────────────────────────────────────────────

  _trySyncToNative() {
    const d = this._getSegmentValueByType('day')
    const m = this._getSegmentValueByType('month')
    const y = this._getSegmentValueByType('year')
    if (d == null || m == null || y == null) return

    const date = new Date(y, m - 1, d)
    if (isNaN(date.getTime())) return

    if (this.min) {
      const minDay = new Date(this.min.getFullYear(), this.min.getMonth(), this.min.getDate())
      if (date < minDay) return
    }
    if (this.max) {
      const maxDay = new Date(this.max.getFullYear(), this.max.getMonth(), this.max.getDate())
      if (date > maxDay) return
    }

    this.selectedDate = date
    this._syncingFromCustom = true
    this.native.value = formatISO(date)
    this.native.dispatchEvent(new Event('change', { bubbles: true }))
    this._syncingFromCustom = false

    const label = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
    this.announce.textContent = `${this.t.announceSelected} ${label}`
  }

  _bindValueSync() {
    // Autofill: native changed externally → sync to segments
    // Guard prevents re-entry when custom UI dispatches its own change events
    this.native.addEventListener('change', this._handleNativeChange)
  }

  _bindFormReset() {
    this.native.form?.addEventListener('reset', this._handleFormReset)
  }

  _syncInitialValue() {
    if (!this.native.value) return
    const [y, m, d] = this.native.value.split('-').map(Number)
    this.selectedDate = new Date(y, m - 1, d)
    this._setSegmentValue(this._getSegmentEl('day'), d)
    this._setSegmentValue(this._getSegmentEl('month'), m)
    this._setSegmentValue(this._getSegmentEl('year'), y)
  }

  // ─── Calendar lifecycle ──────────────────────────────────────────────────────

  _toggleCalendar() {
    this.calendarEl ? this._closeCalendar() : this._openCalendar()
  }

  _openCalendar() {
    if (!this.calendarTemplate) return

    const clone = this.calendarTemplate.content.cloneNode(true)
    this.calendarEl = clone.querySelector('.DateFieldCalendar')

    // Instance-unique IDs (required for multiple instances on same page)
    const headingSpan = this.calendarEl.querySelector('.CalendarHeader span')
    const calId = `datefield-calendar-${this.instanceId}`
    const monthId = `datefield-month-${this.instanceId}`
    this.calendarEl.id = calId
    this.calendarEl.setAttribute('aria-labelledby', monthId)
    if (headingSpan) headingSpan.id = monthId

    // Button labels from translations
    const [prevBtn, nextBtn] = this.calendarEl.querySelectorAll('.CalendarHeader button')
    prevBtn?.setAttribute('aria-label', this.t.prevMonth)
    nextBtn?.setAttribute('aria-label', this.t.nextMonth)
    prevBtn?.addEventListener('click', () => this._navigateMonth(-1))
    nextBtn?.addEventListener('click', () => this._navigateMonth(1))

    // Set month to show: selected date or today
    if (this.selectedDate) {
      this.currentYear = this.selectedDate.getFullYear()
      this.currentMonth = this.selectedDate.getMonth()
    } else {
      const today = new Date()
      this.currentYear = today.getFullYear()
      this.currentMonth = today.getMonth()
    }

    this._renderWeekdays()
    this._renderMonth()

    document.body.appendChild(this.calendarEl)

    // Position below trigger
    const rect = this.trigger.getBoundingClientRect()
    this.calendarEl.style.top = `${rect.bottom + window.scrollY + 4}px`
    this.calendarEl.style.left = `${rect.left + window.scrollX}px`

    // State + trigger updates
    this.root.dataset.state = 'open'
    this.trigger.setAttribute('aria-expanded', 'true')
    this.trigger.setAttribute('aria-label', this.t.closeCalendar)

    // Focus trap + keydown
    this.calendarEl.addEventListener('keydown', e => this._handleCalendarKeydown(e))

    // Outside-click — delay to avoid the opening click triggering immediate close
    this._outsideClickHandler = (e) => {
      if (!this.root.contains(e.target) && !this.calendarEl?.contains(e.target)) {
        this._closeCalendar()
      }
    }
    setTimeout(() => document.addEventListener('click', this._outsideClickHandler), 0)

    // Move focus into calendar
    this._moveFocusIntoCalendar()
  }

  _closeCalendar() {
    if (!this.calendarEl) return
    this.calendarEl.remove()
    this.calendarEl = null
    document.removeEventListener('click', this._outsideClickHandler)
    this._outsideClickHandler = null

    this.root.dataset.state = 'idle'
    this.trigger.setAttribute('aria-expanded', 'false')
    this.trigger.setAttribute('aria-label', this.t.openCalendar)
    this.trigger.focus()
  }

  _navigateMonth(direction) {
    this.currentMonth += direction
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++ }
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear-- }
    this._renderMonth()
    // aria-live on the heading span announces new month automatically
  }

  _renderWeekdays() {
    const names = getWeekdayNames(this.locale)
    const ths = this.calendarEl.querySelectorAll('.Grid thead th')
    ths.forEach((th, i) => {
      if (!names[i]) return
      th.textContent = names[i]
      // Full name for aria-label — more reliable than abbr title across SR/browser pairs
      const anchor = new Date(2024, 0, 1)
      anchor.setDate(anchor.getDate() + i)
      th.setAttribute('aria-label', new Intl.DateTimeFormat(this.locale, { weekday: 'long' }).format(anchor))
    })
  }

  _renderMonth() {
    const headingSpan = this.calendarEl.querySelector('.CalendarHeader span')
    const monthName = getMonthName(this.currentYear, this.currentMonth, this.locale)
    if (headingSpan) headingSpan.textContent = `${monthName} ${this.currentYear}`

    const tbody = this.calendarEl.querySelector('.Grid tbody')
    tbody.innerHTML = ''

    const today = new Date()
    const firstDay = getFirstWeekdayOfMonth(this.currentYear, this.currentMonth)
    const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth)

    const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear
    const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1
    const prevMonthDays = getDaysInMonth(prevYear, prevMonth)

    const nextYear = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear
    const nextMonth = this.currentMonth === 11 ? 0 : this.currentMonth + 1

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
    let dayCount = 1
    let nextMonthDay = 1
    let row = this._createRow()

    for (let i = 0; i < totalCells; i++) {
      if (i > 0 && i % 7 === 0) {
        tbody.appendChild(row)
        row = this._createRow()
      }

      let date, isOutsideMonth = false
      if (i < firstDay) {
        date = new Date(prevYear, prevMonth, prevMonthDays - firstDay + i + 1)
        isOutsideMonth = true
      } else if (dayCount <= daysInMonth) {
        date = new Date(this.currentYear, this.currentMonth, dayCount++)
      } else {
        date = new Date(nextYear, nextMonth, nextMonthDay++)
        isOutsideMonth = true
      }

      row.appendChild(this._createCell(date, isOutsideMonth, today))
    }
    tbody.appendChild(row)

    this._updateRovingTabindex()
  }

  _createRow() {
    const tr = document.createElement('tr')
    tr.setAttribute('role', 'row')
    return tr
  }

  _createCell(date, isOutsideMonth, today) {
    const td = document.createElement('td')
    td.setAttribute('role', 'gridcell')

    const isToday = date.toDateString() === today.toDateString()
    const isSelected = this.selectedDate && date.toDateString() === this.selectedDate.toDateString()
    const isDisabled = isDayDisabled(date, this.min, this.max)

    if (isOutsideMonth) td.dataset.outsideMonth = ''
    if (isToday) td.dataset.today = ''
    if (isSelected) { td.dataset.selected = ''; td.setAttribute('aria-selected', 'true') }
    else td.setAttribute('aria-selected', 'false')
    if (isDisabled) { td.dataset.disabled = ''; td.setAttribute('aria-disabled', 'true') }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('tabindex', '-1')
    btn.dataset.date = formatISO(date) // data-date on button

    // aria-label: full date + state suffixes in fixed order
    const dateLabel = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
    const suffixes = [
      isToday ? `, ${this.t.today}` : '',
      isSelected ? `, ${this.t.selected}` : '',
      isDisabled ? `, ${this.t.notAvailable}` : '',
    ].join('')
    btn.setAttribute('aria-label', `${dateLabel}${suffixes}`)
    btn.textContent = date.getDate()

    btn.addEventListener('click', () => {
      if (isDisabled) return
      if (isOutsideMonth) {
        // Navigate to that month and select
        this.currentYear = date.getFullYear()
        this.currentMonth = date.getMonth()
      }
      this._selectDate(date)
    })

    td.appendChild(btn)
    return td
  }

  _updateRovingTabindex() {
    const grid = this.calendarEl.querySelector('.Grid')
    grid.querySelectorAll('td button').forEach(b => b.setAttribute('tabindex', '-1'))

    // Priority: selected → today (non-disabled) → first non-disabled non-outside-month
    const todayISO = formatISO(new Date())
    const todayBtn = grid.querySelector(`button[data-date="${todayISO}"]`)
    const todayEnabled = todayBtn && !todayBtn.closest('[aria-disabled="true"]') ? todayBtn : null

    const target = grid.querySelector('td[data-selected] button')
      ?? todayEnabled
      ?? grid.querySelector('td:not([data-outside-month]):not([aria-disabled="true"]) button')
    if (target) target.setAttribute('tabindex', '0')
  }

  _moveFocusIntoCalendar() {
    const grid = this.calendarEl.querySelector('.Grid')
    const todayISO = formatISO(new Date())
    const todayBtn = grid.querySelector(`button[data-date="${todayISO}"]`)
    const todayEnabled = todayBtn && !todayBtn.closest('[aria-disabled="true"]') ? todayBtn : null

    const target = grid.querySelector('td[data-selected] button')
      ?? todayEnabled
      ?? grid.querySelector('td:not([data-outside-month]):not([aria-disabled="true"]) button')
    target?.focus()
  }

  _selectDate(date) {
    this.selectedDate = date

    this._syncingFromCustom = true
    this.native.value = formatISO(date)
    this.native.dispatchEvent(new Event('change', { bubbles: true }))
    this._syncingFromCustom = false

    // Sync segments
    this._setSegmentValue(this._getSegmentEl('day'), date.getDate())
    this._setSegmentValue(this._getSegmentEl('month'), date.getMonth() + 1)
    this._setSegmentValue(this._getSegmentEl('year'), date.getFullYear())

    // Live region
    const label = date.toLocaleDateString(this.locale, { dateStyle: 'long' })
    this.announce.textContent = `${this.t.announceSelected} ${label}`

    this._closeCalendar()
  }

  // ─── Calendar keyboard ───────────────────────────────────────────────────────

  _handleCalendarKeydown(e) {
    const grid = this.calendarEl.querySelector('.Grid')
    const focusedBtn = grid.querySelector('button:focus')

    if (e.key === 'Escape') {
      e.preventDefault()
      this._closeCalendar()
      return
    }

    // Tab wrap — only non-disabled day buttons + prev/next month buttons
    if (e.key === 'Tab') {
      const [prevBtn, nextBtn] = this.calendarEl.querySelectorAll('.CalendarHeader button')
      const tabbable = [
        prevBtn,
        ...Array.from(grid.querySelectorAll('td:not([aria-disabled="true"]) button')),
        nextBtn,
      ].filter(Boolean)

      const first = tabbable[0]
      const last = tabbable[tabbable.length - 1]
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      }
      return
    }

    // Grid navigation — only when focus is on a day button
    if (!focusedBtn) return
    const currentISO = focusedBtn.dataset.date
    if (!currentISO) return
    const [fy, fm, fd] = currentISO.split('-').map(Number)
    let target = new Date(fy, fm - 1, fd)

    const arrowDelta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

    if (arrowDelta[e.key] !== undefined) {
      e.preventDefault()
      target.setDate(target.getDate() + arrowDelta[e.key])
      this._focusCalendarDate(target)
    } else if (e.ctrlKey && e.key === 'Home') {
      // MUST be before plain Home check
      e.preventDefault()
      this._focusCalendarDate(new Date(this.currentYear, this.currentMonth, 1))
    } else if (e.ctrlKey && e.key === 'End') {
      e.preventDefault()
      this._focusCalendarDate(new Date(this.currentYear, this.currentMonth, getDaysInMonth(this.currentYear, this.currentMonth)))
    } else if (e.key === 'Home') {
      e.preventDefault()
      const dow = (target.getDay() + 6) % 7
      target.setDate(target.getDate() - dow)
      this._focusCalendarDate(target)
    } else if (e.key === 'End') {
      e.preventDefault()
      const dow = (target.getDay() + 6) % 7
      target.setDate(target.getDate() + (6 - dow))
      this._focusCalendarDate(target)
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      this._focusCalendarDate(new Date(fy, fm - 2, fd))
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      this._focusCalendarDate(new Date(fy, fm, fd))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const td = focusedBtn.closest('td')
      if (td && !td.hasAttribute('aria-disabled')) {
        this._selectDate(target)
      }
    }
  }

  _focusCalendarDate(date) {
    const iso = formatISO(date)
    // data-date is on the <button> element
    let btn = this.calendarEl.querySelector(`button[data-date="${iso}"]`)

    if (!btn) {
      // Navigate to target month
      this.currentYear = date.getFullYear()
      this.currentMonth = date.getMonth()
      this._renderMonth()
      btn = this.calendarEl.querySelector(`button[data-date="${iso}"]`)
    }

    if (btn) {
      const grid = this.calendarEl.querySelector('.Grid')
      grid.querySelectorAll('td button').forEach(b => b.setAttribute('tabindex', '-1'))
      btn.setAttribute('tabindex', '0')
      btn.focus()
    }
  }
}

export default DateField
