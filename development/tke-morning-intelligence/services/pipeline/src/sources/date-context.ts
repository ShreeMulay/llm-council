/**
 * Date Context Setup
 *
 * Computes all date-related context for today:
 * - Day/month/year info in Central Time
 * - Holiday detection (fixed + variable US holidays)
 * - Healthcare observances
 * - Payday detection (15th + last day of month)
 *
 * Ported from n8n "Date Context Setup" code node.
 */

import type { DateInfo, HolidayInfo } from '../types'

const TIME_ZONE = 'America/Chicago'

interface DateContext {
  dateInfo: DateInfo
  holidayInfo: HolidayInfo
}

export function computeDateContext(): DateContext {
  const now = new Date()
  const opts: Intl.DateTimeFormatOptions = { timeZone: TIME_ZONE }

  const dayOfWeek = now.toLocaleDateString('en-US', { ...opts, weekday: 'long' })
  const dayOfMonth = parseInt(now.toLocaleDateString('en-US', { ...opts, day: 'numeric' }))
  const month = parseInt(now.toLocaleDateString('en-US', { ...opts, month: 'numeric' }))
  const year = parseInt(now.toLocaleDateString('en-US', { ...opts, year: 'numeric' }))
  const monthName = now.toLocaleDateString('en-US', { ...opts, month: 'long' })
  const formattedDate = now.toLocaleDateString('en-US', {
    ...opts, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`

  const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday'
  const isSunday = dayOfWeek === 'Sunday'

  // Holiday detection
  const todayHoliday = detectHoliday(month, dayOfMonth, year)
  const healthcareEvent = detectHealthcareObservance(month, dayOfMonth, year)

  // Payday detection (15th and last day of month)
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  const isPayday = dayOfMonth === 15 || dayOfMonth === lastDayOfMonth
  const paydayNote = isPayday
    ? (dayOfMonth === 15 ? 'Mid-month payday' : 'End of month payday')
    : ''

  return {
    dateInfo: {
      dayOfWeek, dayOfMonth, month, monthName, year,
      formattedDate, isoDate, isWeekend, isSunday,
    },
    holidayInfo: {
      todayHoliday,
      healthcareEvent,
      isPayday,
      paydayNote,
    },
  }
}

// ── Holiday Detection ───────────────────────────────────────

interface FixedHoliday {
  month: number
  day: number
  name: string
}

interface VariableHoliday {
  month: number
  weekday: number // 0=Sun, 1=Mon, ..., 6=Sat
  n: number       // positive = nth occurrence, negative = from end
  name: string
}

const FIXED_HOLIDAYS: FixedHoliday[] = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 6, day: 19, name: 'Juneteenth' },
  { month: 7, day: 4, name: 'Independence Day' },
  { month: 11, day: 11, name: 'Veterans Day' },
  { month: 12, day: 24, name: 'Christmas Eve' },
  { month: 12, day: 25, name: 'Christmas Day' },
  { month: 12, day: 31, name: "New Year's Eve" },
]

const VARIABLE_HOLIDAYS: VariableHoliday[] = [
  { month: 1, weekday: 1, n: 3, name: 'Martin Luther King Jr. Day' },
  { month: 2, weekday: 1, n: 3, name: "Presidents' Day" },
  { month: 5, weekday: 1, n: -1, name: 'Memorial Day' },
  { month: 9, weekday: 1, n: 1, name: 'Labor Day' },
  { month: 10, weekday: 1, n: 2, name: 'Columbus Day' },
  { month: 11, weekday: 4, n: 4, name: 'Thanksgiving' },
]

function getNthWeekday(yr: number, mo: number, weekday: number, n: number): number | null {
  if (n > 0) {
    let count = 0
    for (let d = 1; d <= 31; d++) {
      const date = new Date(yr, mo - 1, d)
      if (date.getMonth() !== mo - 1) break
      if (date.getDay() === weekday) {
        count++
        if (count === n) return d
      }
    }
  } else {
    const lastDay = new Date(yr, mo, 0).getDate()
    for (let d = lastDay; d >= 1; d--) {
      const date = new Date(yr, mo - 1, d)
      if (date.getDay() === weekday) return d
    }
  }
  return null
}

function detectHoliday(month: number, dayOfMonth: number, year: number): string | null {
  // Check fixed holidays
  for (const h of FIXED_HOLIDAYS) {
    if (h.month === month && h.day === dayOfMonth) return h.name
  }

  // Check variable holidays
  for (const h of VARIABLE_HOLIDAYS) {
    if (h.month === month) {
      const hDay = getNthWeekday(year, h.month, h.weekday, h.n)
      if (hDay === dayOfMonth) return h.name
    }
  }

  return null
}

// ── Healthcare Observances ──────────────────────────────────

interface HealthcareObservance {
  month: number
  day?: number
  weekday?: number
  n?: number
  name: string
  isMonth?: boolean
}

const HEALTHCARE_OBSERVANCES: HealthcareObservance[] = [
  { month: 2, name: 'American Heart Month', isMonth: true },
  { month: 3, name: 'National Kidney Month', isMonth: true },
  { month: 3, weekday: 4, n: 2, name: 'World Kidney Day' },
  { month: 4, day: 7, name: 'World Health Day' },
  { month: 5, name: 'National High Blood Pressure Education Month', isMonth: true },
  { month: 9, name: 'National Cholesterol Education Month', isMonth: true },
  { month: 11, name: 'National Diabetes Month', isMonth: true },
]

function detectHealthcareObservance(month: number, dayOfMonth: number, year: number): string | null {
  for (const obs of HEALTHCARE_OBSERVANCES) {
    if (obs.month !== month) continue

    if (obs.isMonth) return obs.name
    if (obs.day === dayOfMonth) return obs.name
    if (obs.weekday !== undefined && obs.n !== undefined) {
      const eventDay = getNthWeekday(year, obs.month, obs.weekday, obs.n)
      if (eventDay === dayOfMonth) return obs.name
    }
  }
  return null
}
