/**
 * Google Calendar + Gusto ICS data source
 *
 * Fetches today's events from three calendars:
 * 1. Provider & Clinic Schedule — via Google Calendar API (shared with SA)
 * 2. Jackson Hospital Call Schedule — via Google Calendar API (shared with SA)
 * 3. Gusto HR — via direct ICS fetch (not shared via Calendar API)
 *
 * Gusto ICS is in PCT timezone — converted to CST for display.
 * PTO/sick/unpaid time off is filtered from operations but celebrations are kept.
 */

import { google } from 'googleapis'
import ICAL from 'ical.js'
import type { CalendarEvent } from '../types'

// ── Google Calendar Config ────────────────────────────────────
interface GCalConfig {
  name: string
  id: string
}

const GOOGLE_CALENDARS: GCalConfig[] = [
  {
    name: 'Provider & Clinic',
    id: process.env.CALENDAR_PROVIDER_ID ?? '',
  },
  {
    name: 'Jackson Hospital Call Schedule',
    id: process.env.CALENDAR_JACKSON_ID ?? '',
  },
]

const GUSTO_ICS_URL = process.env.GUSTO_ICS_URL ?? ''
const SA_KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? ''

// ── Main Fetch ────────────────────────────────────────────────
export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const allEvents: CalendarEvent[] = []

  // Fetch Google Calendar events + Gusto ICS in parallel
  const [gcalResults, gustoResults] = await Promise.allSettled([
    fetchGoogleCalendarEvents(),
    fetchGustoICSEvents(),
  ])

  if (gcalResults.status === 'fulfilled') {
    allEvents.push(...gcalResults.value)
  } else {
    console.warn('[Calendar] Google Calendar fetch failed:', gcalResults.reason)
  }

  if (gustoResults.status === 'fulfilled') {
    allEvents.push(...gustoResults.value)
  } else {
    console.warn('[Calendar] Gusto ICS fetch failed:', gustoResults.reason)
  }

  console.log(`[Calendar] Fetched ${allEvents.length} events total`)
  return allEvents
}

// ── Google Calendar API ───────────────────────────────────────
async function fetchGoogleCalendarEvents(): Promise<CalendarEvent[]> {
  if (!SA_KEY_PATH) {
    console.warn('[Calendar] No GOOGLE_APPLICATION_CREDENTIALS set, skipping Google Calendar')
    return []
  }

  // Create auth client from service account key
  const auth = new google.auth.GoogleAuth({
    keyFile: SA_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })

  const calendar = google.calendar({ version: 'v3', auth })

  // Get today's date range in CST (America/Chicago)
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) // YYYY-MM-DD
  const timeMin = new Date(`${todayStr}T00:00:00-06:00`).toISOString()
  const timeMax = new Date(`${todayStr}T23:59:59-06:00`).toISOString()

  const events: CalendarEvent[] = []

  // Fetch from each Google Calendar in parallel
  const results = await Promise.allSettled(
    GOOGLE_CALENDARS.map(async (cal) => {
      if (!cal.id) return []

      try {
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50,
        })

        const items = response.data.items ?? []
        console.log(`[Calendar] ${cal.name}: ${items.length} events`)

        return items.map((item): CalendarEvent => {
          const isAllDay = !!item.start?.date && !item.start?.dateTime
          const startTime = item.start?.dateTime ?? item.start?.date ?? ''
          const endTime = item.end?.dateTime ?? item.end?.date ?? ''

          // Format time for display (CST)
          let displayStart = ''
          let displayEnd = ''
          if (!isAllDay && startTime) {
            const s = new Date(startTime)
            displayStart = s.toLocaleTimeString('en-US', {
              timeZone: 'America/Chicago',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          }
          if (!isAllDay && endTime) {
            const e = new Date(endTime)
            displayEnd = e.toLocaleTimeString('en-US', {
              timeZone: 'America/Chicago',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          }

          return {
            calendarName: cal.name,
            summary: item.summary ?? '(No title)',
            start: displayStart || startTime,
            end: displayEnd || endTime,
            allDay: isAllDay,
          }
        })
      } catch (err) {
        console.error(`[Calendar] Error fetching ${cal.name}:`, err instanceof Error ? err.message : err)
        return []
      }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      events.push(...result.value)
    }
  }

  return events
}

// ── Gusto ICS Fetch + Parse ───────────────────────────────────
async function fetchGustoICSEvents(): Promise<CalendarEvent[]> {
  if (!GUSTO_ICS_URL) {
    console.warn('[Calendar] No GUSTO_ICS_URL set, skipping Gusto')
    return []
  }

  try {
    const response = await fetch(GUSTO_ICS_URL, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      throw new Error(`Gusto ICS fetch failed: ${response.status} ${response.statusText}`)
    }

    const icsText = await response.text()
    const jcalData = ICAL.parse(icsText)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents('vevent')

    // Get today's date in CST (YYYY-MM-DD)
    const now = new Date()
    const todayCST = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    const events: CalendarEvent[] = []

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent)
      const summary = event.summary ?? ''
      const startDate = event.startDate
      if (!startDate) continue

      // Get event date as YYYY-MM-DD
      const eventDateStr = `${startDate.year}-${String(startDate.month).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`

      // Check if this event is for today (CST)
      if (eventDateStr !== todayCST) continue

      events.push({
        calendarName: 'Gusto',
        summary,
        start: eventDateStr,
        end: '',
        allDay: true,
      })
    }

    console.log(`[Calendar] Gusto: ${events.length} events for today (from ${vevents.length} total)`)
    return events
  } catch (err) {
    console.error('[Calendar] Gusto ICS error:', err instanceof Error ? err.message : err)
    return []
  }
}

// ── Celebration Parser ────────────────────────────────────────
/**
 * Parse Gusto calendar events to extract celebrations.
 * Gusto events follow naming patterns:
 * - "Name's Birthday" → birthday
 * - "Name's Work Anniversary" / "Hire Date Anniversary" → anniversary
 * - "Name's First Day" → new hire
 * - "PTO: Name" / "Sick: Name" → time off (filter from operations)
 */
export function parseCelebrations(events: CalendarEvent[]) {
  const birthdays: string[] = []
  const anniversaries: Array<{ name: string; years: number }> = []
  const newHires: string[] = []

  for (const event of events) {
    if (event.calendarName !== 'Gusto') continue

    const summary = (event.summary ?? '').toLowerCase()

    if (summary.includes('birthday')) {
      const name = event.summary
        .replace(/[''\u2019]s?\s*birthday/i, '')
        .replace(/[-]/g, '')
        .trim()
      if (name) birthdays.push(name)
    } else if (summary.includes('anniversary') || summary.includes('hire date')) {
      const yearsMatch = event.summary.match(/(\d+)\s*year/i)
      const years = yearsMatch?.[1] ? parseInt(yearsMatch[1], 10) : 1
      const name = event.summary
        .replace(/[''\u2019]s?\s*(work\s+)?anniversary|\d+\s*year|hire\s*date/gi, '')
        .replace(/[-]/g, '')
        .trim()
      if (name) anniversaries.push({ name, years })
    } else if (summary.includes('first day') || summary.includes('start date')) {
      const name = event.summary
        .replace(/[''\u2019]s?\s*(first\s+day|start\s+date)/gi, '')
        .replace(/[-]/g, '')
        .trim()
      if (name) newHires.push(name)
    }
  }

  return { birthdays, anniversaries, newHires }
}

// ── Operations Filter ─────────────────────────────────────────
/** Filter out Gusto PTO/sick events from operations display */
export function filterOperationsEvents(events: CalendarEvent[]): CalendarEvent[] {
  const ptoPatterns = [
    'pto', 'paid time off', 'unpaid time', 'sick', 'vacation',
    'time off', 'timeoff', 'personal day', 'bereavement', 'jury duty',
  ]

  return events.filter(event => {
    if (event.calendarName !== 'Gusto') return true
    const summary = (event.summary ?? '').toLowerCase()
    return !ptoPatterns.some(p => summary.includes(p))
  })
}
