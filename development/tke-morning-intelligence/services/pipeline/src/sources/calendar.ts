/**
 * Google Calendar data source
 *
 * Fetches today's events from three calendars:
 * 1. Gusto (HR events, PTO, birthdays, anniversaries)
 * 2. Jackson Hospital (clinic events)
 * 3. Provider & Clinic Schedule
 *
 * Uses Google Calendar API with service account.
 */

import type { CalendarEvent } from '../types'

interface CalendarConfig {
  name: string
  id: string
}

const CALENDARS: CalendarConfig[] = [
  {
    name: 'Gusto',
    id: process.env.CALENDAR_GUSTO_ID ?? 'aq1a9qjeb0qsfihob4lavttvcvthv82n@import.calendar.google.com',
  },
  {
    name: 'Jackson Hospital',
    id: process.env.CALENDAR_JACKSON_ID ?? 'thekidneyexperts.com_09o575tcf895dooh15n42f9tmo@group.calendar.google.com',
  },
  {
    name: 'Provider & Clinic',
    id: process.env.CALENDAR_PROVIDER_ID ?? 'c_731d2d64a4858ea33eb0283b629581c17f7c1bfdbb2e665eb2c386bebbb14950@group.calendar.google.com',
  },
]

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  // TODO: Phase 1 - Implement Google Calendar API calls with service account
  // For now, return empty array until credentials are configured
  //
  // Implementation plan:
  // 1. Use @googleapis/calendar with service account
  // 2. Fetch today's events for each calendar in parallel
  // 3. Tag each event with calendarName
  // 4. Filter Gusto PTO/sick events from operations display
  //    (keep them for celebrations - birthdays, anniversaries)

  console.log('[Calendar] Stub: returning empty events (not yet connected)')
  return []
}

/**
 * Parse Gusto calendar events to extract celebrations.
 * Gusto events follow naming patterns:
 * - "Name's Birthday" → birthday
 * - "Name's Work Anniversary" → anniversary
 * - "Name's First Day" → new hire
 * - "PTO: Name" → time off (filter from operations)
 */
export function parseCelebrations(events: CalendarEvent[]) {
  const birthdays: string[] = []
  const anniversaries: Array<{ name: string; years: number }> = []
  const newHires: string[] = []

  for (const event of events) {
    if (event.calendarName !== 'Gusto') continue

    const summary = (event.summary ?? '').toLowerCase()

    if (summary.includes('birthday')) {
      const name = event.summary.replace(/birthday/i, '').replace(/[-'s]/g, '').trim()
      if (name) birthdays.push(name)
    } else if (summary.includes('anniversary') || summary.includes('hire date')) {
      const name = event.summary.replace(/anniversary|hire date|work/gi, '').replace(/[-'s]/g, '').trim()
      if (name) anniversaries.push({ name, years: 1 })
    } else if (summary.includes('first day')) {
      const name = event.summary.replace(/first day|start date/gi, '').replace(/[-'s]/g, '').trim()
      if (name) newHires.push(name)
    }
  }

  return { birthdays, anniversaries, newHires }
}

/** Filter out Gusto PTO/sick events from operations display */
export function filterOperationsEvents(events: CalendarEvent[]): CalendarEvent[] {
  const ptoPatterns = ['pto', 'paid time off', 'unpaid time', 'sick', 'vacation', 'time off', 'timeoff']

  return events.filter(event => {
    if (event.calendarName !== 'Gusto') return true
    const summary = (event.summary ?? '').toLowerCase()
    return !ptoPatterns.some(p => summary.includes(p))
  })
}
