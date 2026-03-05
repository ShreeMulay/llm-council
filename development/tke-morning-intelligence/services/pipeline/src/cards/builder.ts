/**
 * Google Chat Card Builder — TKE Morning Intelligence
 *
 * Formats content into polished cardsV2 format for Google Chat.
 * Uses advanced widget types:
 *   - columns (2-col layouts for "At A Glance")
 *   - decoratedText (icon + label + text for compact display)
 *   - divider (horizontal separators)
 *   - buttonList (interactive footer buttons)
 *   - collapsible sections with uncollapsibleWidgetsCount
 *   - <font color="..."> for status indicators
 *
 * Card types:
 *   1. Mindset (daily educational content — 6 sections)
 *   2. Operations (weather, schedule, news — weekdays only)
 *   3. Celebrations (birthdays, holidays, paydays)
 */

import { WEATHER_EMOJI } from '../sources/weather'
import { parseCelebrations, filterOperationsEvents } from '../sources/calendar'
import type { DailyCulture } from '../sources/culture'
import type { NephMadnessWriteup } from '../content-engine'
import type { DailyContext, GenerateResponse, Medication, SystemsThinking, Quote, NephrologyHistory, DidYouKnow, AiIdeas } from '../types'

// ── Colors ────────────────────────────────────────────────────
const C = {
  green: '#80e27e',
  red: '#ff5252',
  blue: '#448aff',
  amber: '#ffd740',
  purple: '#b388ff',
  teal: '#64ffda',
  muted: '#9e9e9e',
} as const

// ── Avatar URLs ───────────────────────────────────────────────
const NEPHROLOGY_ICON = 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/nephrology/default/48px.svg'
const CALENDAR_ICON = 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/calendar_today/default/48px.svg'
const CELEBRATION_ICON = 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/celebration/default/48px.svg'

// ── Widget Helpers ────────────────────────────────────────────
const text = (t: string) => ({ textParagraph: { text: t } })
const divider = () => ({ divider: {} })

function columns(left: unknown[], right: unknown[]) {
  return {
    columns: {
      columnItems: [
        { horizontalSizeStyle: 'FILL_AVAILABLE_SPACE', horizontalAlignment: 'START', verticalAlignment: 'TOP', widgets: left },
        { horizontalSizeStyle: 'FILL_AVAILABLE_SPACE', horizontalAlignment: 'START', verticalAlignment: 'TOP', widgets: right },
      ],
    },
  }
}

function sectionHeader(emoji: string, title: string, subtitle?: string): string {
  let h = `${emoji} <b>${title}</b>`
  if (subtitle) h += `  <font color="${C.muted}">|  ${subtitle}</font>`
  return h
}

// ── Mindset Card ──────────────────────────────────────────────
export function buildMindsetCard(ctx: DailyContext, content: GenerateResponse, culture?: DailyCulture) {
  const { dateInfo, holidayInfo, weather } = ctx

  // Build rich subtitle with weather
  let subtitle = `${dateInfo.dayOfWeek}, ${dateInfo.formattedDate}  |  Jackson, TN`
  if (weather) {
    const emoji = WEATHER_EMOJI[weather.icon] ?? '🌡️'
    subtitle += `  |  ${emoji} ${weather.temp}°F`
  }

  const sections: unknown[] = []

  // ── At A Glance (columns) ─────────────────────────────
  const glanceLeft: string[] = []
  const glanceRight: string[] = []

  if (holidayInfo.todayHoliday) glanceLeft.push(`🎉 <b>${holidayInfo.todayHoliday}</b>`)
  if (holidayInfo.healthcareEvent) glanceLeft.push(`💜 <b>${holidayInfo.healthcareEvent}</b>`)
  if (holidayInfo.isPayday) glanceRight.push(`💰 <b>Payday!</b> ${holidayInfo.paydayNote}`)

  if (weather) {
    const emoji = WEATHER_EMOJI[weather.icon] ?? '🌡️'
    glanceLeft.push(`${emoji} <b>${weather.temp}°F</b> ${capitalize(weather.description)}`)
    glanceLeft.push(`Feels ${weather.feels_like}°F • 💧 ${weather.humidity}%`)

    // Patient impact warnings
    if (weather.temp >= 95) {
      glanceRight.push(`<font color="${C.red}">🔴 HEAT ALERT: CKD patients at risk for dehydration</font>`)
    } else if (weather.temp <= 32) {
      glanceRight.push(`<font color="${C.blue}">🔵 FREEZE WARNING: Watch for ice, patient falls risk</font>`)
    } else {
      glanceRight.push(`<font color="${C.green}">✅ Standard conditions</font>`)
    }
  }

  if (glanceLeft.length > 0 || glanceRight.length > 0) {
    sections.push({
      widgets: [
        text(sectionHeader('📊', 'At A Glance')),
        columns(
          [text(glanceLeft.join('\n') || '<i>No special events</i>')],
          [text(glanceRight.join('\n') || ' ')],
        ),
      ],
    })
  }

  // ── Company Culture ────────────────────────────────────
  if (culture) {
    const cultureWidgets: unknown[] = [
      divider(),
      text(formatCulture(culture)),
    ]
    sections.push({
      header: sectionHeader('🏛️', 'TKE Culture', `Fundamental #${culture.fundamental.number}`),
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: cultureWidgets,
    })
  }

  // ── Systems Thinking ──────────────────────────────────
  if (content.systems_thinking) {
    sections.push({
      widgets: [
        divider(),
        text(formatSystems(content.systems_thinking)),
      ],
    })
  }

  // ── Daily Wisdom (Quote) ──────────────────────────────
  if (content.quote) {
    sections.push({
      header: sectionHeader('💬', 'Daily Wisdom'),
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        text(formatQuote(content.quote)),
      ],
    })
  }

  // ── On This Day ───────────────────────────────────────
  if (content.nephrology_history) {
    sections.push({
      header: sectionHeader('📜', 'On This Day in Nephrology'),
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        text(formatHistory(content.nephrology_history)),
      ],
    })
  }

  // ── Did You Know ──────────────────────────────────────
  if (content.did_you_know) {
    sections.push({
      header: sectionHeader('🧠', 'Did You Know?'),
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        text(formatDidYouKnow(content.did_you_know)),
      ],
    })
  }

  // ── Medication Spotlight ──────────────────────────────
  if (content.medication) {
    sections.push({
      header: sectionHeader('💊', 'Medication Spotlight'),
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        text(formatMedication(content.medication)),
      ],
    })
  }

  // ── AI Ideas ──────────────────────────────────────────
  if (content.ai_ideas) {
    sections.push({
      header: sectionHeader('🤖', 'AI Ideas'),
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: [
        text(formatAiIdeas(content.ai_ideas)),
      ],
    })
  }

  // ── Footer ────────────────────────────────────────────
  const modelsUsed = content.meta?.models_used
    ? Object.values(content.meta.models_used).filter((v, i, a) => a.indexOf(v) === i).join(', ')
    : 'unknown'
  const genTime = content.meta?.generation_time_ms
    ? `${(content.meta.generation_time_ms / 1000).toFixed(1)}s`
    : '?'

  sections.push({
    widgets: [
      divider(),
      text(`<font color="${C.muted}">🏥 TKE Morning Intelligence  |  ⚙️ ${modelsUsed}  |  ⏱️ ${genTime}  |  Card 1/3</font>`),
    ],
  })

  return {
    cardsV2: [{
      cardId: 'mindset',
      card: {
        header: {
          title: '🏥 Good Morning, TKE Team!',
          subtitle,
          imageUrl: NEPHROLOGY_ICON,
          imageType: 'CIRCLE',
        },
        sections,
      },
    }],
  }
}

// ── Operations Card ───────────────────────────────────────────
// Weekdays: full schedule + clinical weather + news
// Weekends: slim on-call coverage + personal weather + forecast
export function buildOperationsCard(ctx: DailyContext) {
  const { dateInfo, weather, calendarEvents, news, weekendForecast, weatherQuip } = ctx
  const isWeekend = dateInfo.isWeekend
  const isFriday = dateInfo.dayOfWeek === 'Friday'

  const sections: unknown[] = []

  // ── Schedule Section — grouped by calendar source ─────
  if (isWeekend) {
    // Weekend: only Jackson Hospital Call Schedule
    const hospitalEvents = calendarEvents.filter(e => e.calendarName === 'Jackson Hospital Call Schedule')
    const scheduleWidgets: unknown[] = []

    if (hospitalEvents.length > 0) {
      scheduleWidgets.push(text(`<font color="${C.amber}"><b>📞 Jackson Hospital Call</b></font>`))
      for (const e of hospitalEvents) {
        if (e.allDay) {
          scheduleWidgets.push(text(`  📌 <b>${e.summary}</b>`))
        } else {
          const timeRange = e.end
            ? `<b>${compactTime(e.start ?? '')}–${compactTime(e.end)}</b>`
            : `<b>${compactTime(e.start ?? '')}</b>`
          scheduleWidgets.push(text(`  ${timeRange}  ${e.summary}`))
        }
      }
    } else {
      scheduleWidgets.push(text('📞 <i>No hospital coverage scheduled today</i>'))
    }

    sections.push({
      header: sectionHeader('📞', 'On-Call Coverage'),
      widgets: scheduleWidgets,
    })
  } else {
    // Weekday: full schedule grouped by calendar
    const opsEvents = filterOperationsEvents(calendarEvents)
    const scheduleWidgets: unknown[] = []

    if (opsEvents.length > 0) {
      const grouped = groupByCalendar(opsEvents)
      let isFirst = true

      for (const [calName, events] of grouped) {
        if (!isFirst) scheduleWidgets.push(divider())
        isFirst = false

        const calColor = CALENDAR_COLORS[calName] ?? C.muted
        const calEmoji = CALENDAR_EMOJI[calName] ?? '📅'
        scheduleWidgets.push(text(`<font color="${calColor}"><b>${calEmoji} ${calName}</b></font>`))

        for (const e of events) {
          if (e.allDay) {
            scheduleWidgets.push(text(`  📌 <b>${e.summary}</b>`))
          } else {
            const timeRange = e.end
              ? `<b>${compactTime(e.start ?? '')}–${compactTime(e.end)}</b>`
              : `<b>${compactTime(e.start ?? '')}</b>`
            scheduleWidgets.push(text(`  ${timeRange}  ${e.summary}`))
          }
        }
      }
    } else {
      scheduleWidgets.push(text('📅 <i>No events scheduled today</i>'))
    }

    sections.push({
      header: sectionHeader('📅', "Today's Schedule"),
      collapsible: (filterOperationsEvents(calendarEvents)).length > 6,
      uncollapsibleWidgetsCount: 6,
      widgets: scheduleWidgets,
    })
  }

  // ── Weather Section ───────────────────────────────────
  if (weather) {
    const emoji = WEATHER_EMOJI[weather.icon] ?? '🌡️'
    let weatherText = `${emoji} <b>${weather.temp}°F</b> ${capitalize(weather.description)}\n`
    weatherText += `Feels ${weather.feels_like}°F • 💧 ${weather.humidity}%\n\n`

    if (isWeekend) {
      // Personal tone — LLM-generated fun one-liner or fallback
      const quipText = weatherQuip ?? 'Enjoy your day off, TKE team!'
      weatherText += `<font color="${C.teal}"><i>${quipText}</i></font>`
    } else {
      // Clinical patient impact assessment
      if (weather.temp >= 95) {
        weatherText += `<font color="${C.red}">⚠️ <b>Heat Advisory:</b> Remind CKD patients to hydrate. Monitor fluid-restricted patients carefully.</font>`
      } else if (weather.temp >= 85) {
        weatherText += `<font color="${C.amber}">☀️ <b>Warm:</b> Encourage adequate hydration for renal patients.</font>`
      } else if (weather.temp <= 32) {
        weatherText += `<font color="${C.blue}">❄️ <b>Freeze Warning:</b> Watch for icy conditions. Elderly patient fall risk elevated.</font>`
      } else {
        weatherText += `<font color="${C.green}">✅ Standard conditions for patient activity.</font>`
      }
    }

    sections.push({
      header: sectionHeader('🌤️', 'Weather', 'Jackson, TN'),
      widgets: [text(weatherText)],
    })
  }

  // ── Weekend Forecast Preview (Fri/Sat/Sun) ────────────
  if ((isFriday || isWeekend) && weekendForecast && weekendForecast.length > 0) {
    let forecastText = ''
    for (const day of weekendForecast) {
      const emoji = WEATHER_EMOJI[day.icon] ?? '🌡️'
      forecastText += `  ${emoji} <b>${day.dayName}:</b> ${day.high}°F / ${day.low}°F — ${capitalize(day.description)}\n`
    }

    sections.push({
      header: sectionHeader('🌤️', isFriday ? 'Weekend Forecast' : 'Tomorrow'),
      widgets: [text(forecastText.trim())],
    })
  }

  // ── News Section (weekdays only) ──────────────────────
  if (!isWeekend && news.length > 0) {
    const newsWidgets: unknown[] = []
    const colors = [C.red, C.amber, C.green]
    for (let i = 0; i < Math.min(news.length, 3); i++) {
      const a = news[i]!
      const dot = `<font color="${colors[i]}">●</font>`
      let item = `${dot} <b><a href="${a.url}">${a.title}</a></b>`
      item += `\n<font color="${C.muted}">${a.source}</font>`
      if (a.description) {
        const desc = a.description.length > 200 ? a.description.substring(0, 197) + '...' : a.description
        item += `\n${desc}`
      }
      newsWidgets.push(text(item))
    }

    sections.push({
      header: sectionHeader('📰', 'Healthcare News'),
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: newsWidgets,
    })
  }

  // ── Footer ────────────────────────────────────────────
  sections.push({
    widgets: [
      divider(),
      text(`<font color="${C.muted}">🏥 TKE Morning Intelligence  |  Card 2/3</font>`),
    ],
  })

  const cardTitle = isWeekend ? '🏥 TKE Weekend Edition' : "📋 Today's Operations"
  const cardSubtitle = isWeekend
    ? `${dateInfo.dayOfWeek}, ${dateInfo.formattedDate}  |  On-Call Coverage`
    : `${dateInfo.dayOfWeek}, ${dateInfo.formattedDate}  |  Jackson, TN`

  return {
    cardsV2: [{
      cardId: 'operations',
      card: {
        header: {
          title: cardTitle,
          subtitle: cardSubtitle,
          imageUrl: CALENDAR_ICON,
          imageType: 'CIRCLE',
        },
        sections,
      },
    }],
  }
}

// ── Celebrations Card ──────────────────────────────────────────
export function buildCelebrationCard(ctx: DailyContext, nephMadness?: NephMadnessWriteup | null) {
  const { dateInfo, holidayInfo, calendarEvents } = ctx
  const { birthdays, anniversaries, newHires } = parseCelebrations(calendarEvents)

  const hasCelebrations = birthdays.length > 0 || anniversaries.length > 0 || newHires.length > 0
    || holidayInfo.todayHoliday || holidayInfo.healthcareEvent || holidayInfo.isPayday
    || !!nephMadness

  if (!hasCelebrations) return null

  const sections: unknown[] = []
  const widgets: unknown[] = []

  // ── Holiday / Healthcare Event ────────────────────────
  if (holidayInfo.todayHoliday) {
    widgets.push(text(`🎉 <b>Happy ${holidayInfo.todayHoliday}!</b>\nWishing the entire TKE team a wonderful holiday!`))
  }

  if (holidayInfo.healthcareEvent) {
    let eventText = `💜 <b>${holidayInfo.healthcareEvent}</b>`
    if (holidayInfo.healthcareEvent.toLowerCase().includes('kidney')) {
      eventText += `\n<font color="${C.purple}">A special time for our nephrology team! Let's spread awareness about kidney health.</font>`
    } else {
      eventText += `\n<i>An important healthcare awareness observance.</i>`
    }
    widgets.push(text(eventText))
  }

  if (holidayInfo.isPayday) {
    widgets.push(text(`💰 <b>Payday!</b> ${holidayInfo.paydayNote}`))
  }

  if (widgets.length > 0) {
    sections.push({ widgets })
  }

  // ── Personal Celebrations ─────────────────────────────
  const celebWidgets: unknown[] = []

  if (birthdays.length > 0) {
    celebWidgets.push(text(`🎂 <b>Happy Birthday!</b>`))
    for (const name of birthdays) {
      celebWidgets.push(text(`  🎈 Wishing <b>${name}</b> a wonderful birthday!`))
    }
  }

  if (anniversaries.length > 0) {
    if (celebWidgets.length > 0) celebWidgets.push(divider())
    celebWidgets.push(text(`🎉 <b>Work Anniversary!</b>`))
    for (const a of anniversaries) {
      const yearsText = a.years > 1 ? `${a.years} years` : '1 year'
      celebWidgets.push(text(`  ⭐ Congratulations to <b>${a.name}</b> — <font color="${C.green}">${yearsText}</font> with TKE!`))
    }
  }

  if (newHires.length > 0) {
    if (celebWidgets.length > 0) celebWidgets.push(divider())
    celebWidgets.push(text(`👋 <b>Welcome to the Team!</b>`))
    for (const name of newHires) {
      celebWidgets.push(text(`  🌟 Please welcome <b>${name}</b> — today is their first day!`))
    }
  }

  if (celebWidgets.length > 0) {
    sections.push({
      header: '🎊 Team Celebrations',
      widgets: celebWidgets,
    })
  }

  // ── NephMadness 2026 ─────────────────────────────────
  if (nephMadness) {
    const nmWidgets: unknown[] = [
      text(formatNephMadness(nephMadness)),
    ]
    sections.push({
      header: sectionHeader('🏀', 'NephMadness 2026'),
      collapsible: true,
      uncollapsibleWidgetsCount: 1,
      widgets: nmWidgets,
    })
  }

  // ── Footer ────────────────────────────────────────────
  sections.push({
    widgets: [
      divider(),
      text(`<font color="${C.muted}">🏥 TKE Morning Intelligence  |  Card 3/3</font>`),
    ],
  })

  return {
    cardsV2: [{
      cardId: 'celebration',
      card: {
        header: {
          title: '🎊 Team Celebrations!',
          subtitle: `${dateInfo.dayOfWeek}, ${dateInfo.formattedDate}`,
          imageUrl: CELEBRATION_ICON,
          imageType: 'CIRCLE',
        },
        sections,
      },
    }],
  }
}

// ── Section Formatters ────────────────────────────────────────

function formatCulture(c: DailyCulture): string {
  const f = c.fundamental
  let t = `💬 <i>"${f.mantra}"</i>\n\n`
  t += `<font color="${C.green}">✅ <b>Today's Behavior:</b></font>\n${f.todayBehavior}\n\n`
  t += `<font color="${C.red}">🚫 <b>Watch Out For:</b></font>\n${f.watchOutFor}\n\n`
  t += `🪞 <b>Self-Check:</b> <i>"${f.selfCheck}"</i>`

  if (c.culturalTerm) {
    t += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n`
    t += `💡 <b>Cultural Language: ${c.culturalTerm.name}</b>\n`
    t += `<font color="${C.muted}">${c.culturalTerm.definition}</font>`
  }

  return t
}

function formatSystems(s: SystemsThinking): string {
  let t = sectionHeader(s.emoji, `Systems Thinking: ${s.concept}`) + '\n\n'
  t += `<i>${s.coreIdea}</i>\n\n`
  t += `🏥 <b>In Nephrology:</b>\n${s.nephrologyExample}\n\n`
  t += `<font color="${C.green}">🎯 <b>Today's Challenge:</b></font>\n${s.todayChallenge}\n\n`
  t += `<font color="${C.purple}">🤔 <b>Reflection:</b></font> ${s.reflectionQuestion}`
  return t
}

function formatQuote(q: Quote): string {
  let t = `💬 <i>"${q.quote}"</i>\n\n`
  t += `— <b>${q.author}</b>, <font color="${C.muted}">${q.authorRole}</font>\n\n`
  t += `🔗 <i>${q.connectionToTheme}</i>`
  return t
}

function formatHistory(h: NephrologyHistory): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dateStr = `${monthNames[h.month - 1]} ${h.day}, ${h.year}`
  let t = `${h.emoji} <b>${dateStr}</b>\n\n`
  t += `${h.event}\n\n`
  t += `⭐ <b>Why it matters:</b> ${h.significance}\n\n`
  t += `🎲 <b>Fun fact:</b> <i>${h.funFact}</i>`
  return t
}

function formatDidYouKnow(d: DidYouKnow): string {
  let t = `${d.emoji} <b>${d.category}</b>\n\n`
  t += `${d.fact}\n\n`
  if (d.whyItMatters) {
    t += `💡 <b>Why it matters:</b> ${d.whyItMatters}\n\n`
  }
  t += `<font color="${C.muted}">📚 Source: ${d.source}</font>`
  return t
}

function formatMedication(m: Medication): string {
  let t = `${m.emoji} <b>${m.genericName}</b> (${m.brandName})\n`
  t += `<font color="${C.muted}"><i>${m.drugClass}</i></font>\n\n`
  t += `🎯 <b>Use:</b> ${m.primaryUse}\n\n`
  t += `⚙️ <b>Mechanism:</b> ${m.howItWorks}\n\n`
  t += `<font color="${C.amber}">🧪 <b>Renal Dosing:</b> ${m.renalDosing}</font>\n\n`
  t += `💎 <b>Pearl:</b> <i>${m.pearlForPractice}</i>\n\n`
  t += `⚠️ <b>Side Effects:</b> ${m.commonSideEffects.join(' • ')}\n\n`
  t += `🗣️ <b>Counseling:</b> ${m.patientCounselingPoint}`
  return t
}

function formatAiIdeas(a: AiIdeas): string {
  let t = ''

  // Beginner section
  t += `🌱 <b>BEGINNER: ${a.beginner.title}</b>\n`
  t += `🔧 Tool: ${a.beginner.toolName}\n\n`
  t += `${a.beginner.emoji} <b>Try this prompt:</b>\n<i>"${a.beginner.prompt}"</i>\n\n`
  t += `✨ <b>Result:</b> ${a.beginner.expectedResult}\n`
  t += `⏱️ Time saved: <font color="${C.green}">${a.beginner.timeSaved}</font>\n\n`

  // Separator
  t += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  // Advanced section
  t += `🚀 <b>POWER USER: ${a.advanced.toolName}</b>\n`
  t += `🔧 <a href="https://${a.advanced.toolUrl}">${a.advanced.toolUrl}</a>\n\n`
  t += `🏥 <b>Use Case:</b> ${a.advanced.useCase}\n\n`
  t += `▶️ <b>Get Started:</b> ${a.advanced.howToStart}\n\n`
  t += `💡 <b>Pro Tip:</b> <i>${a.advanced.proTip}</i>`

  return t
}

function formatNephMadness(nm: NephMadnessWriteup): string {
  let t = `🏆 <b>${nm.headline}</b>\n\n`
  t += `${nm.body}\n\n`
  t += `<font color="${C.amber}">📋 ${nm.callToAction}</font>`
  return t
}

// ── Utility ───────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Calendar Grouping ────────────────────────────────────────

const CALENDAR_COLORS: Record<string, string> = {
  'Provider & Clinic': C.blue,
  'Jackson Hospital Call Schedule': C.amber,
  'Gusto': C.green,
}

const CALENDAR_EMOJI: Record<string, string> = {
  'Provider & Clinic': '🏥',
  'Jackson Hospital Call Schedule': '📞',
  'Gusto': '📋',
}

/** Group calendar events by source, preserving insertion order */
function groupByCalendar(events: import('../types').CalendarEvent[]): Map<string, import('../types').CalendarEvent[]> {
  const groups = new Map<string, import('../types').CalendarEvent[]>()
  // Desired display order
  const order = ['Provider & Clinic', 'Jackson Hospital Call Schedule', 'Gusto']
  for (const name of order) groups.set(name, [])
  for (const e of events) {
    const list = groups.get(e.calendarName)
    if (list) list.push(e)
    else groups.set(e.calendarName, [e])
  }
  // Remove empty groups
  for (const [key, val] of groups) {
    if (val.length === 0) groups.delete(key)
  }
  return groups
}

/** Compact time format: "8:00 AM" → "8a", "12:30 PM" → "12:30p" */
function compactTime(timeStr: string): string {
  // Already compact or a date string — return as-is
  if (!timeStr || !timeStr.includes(':')) return timeStr
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return timeStr
  const hours = match[1]
  const minutes = match[2]
  const suffix = match[3]!.toLowerCase().charAt(0) // 'a' or 'p'
  return minutes === '00' ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`
}

// ── Error Card ────────────────────────────────────────────────

export function buildErrorCard(errors: string[]) {
  return {
    cardsV2: [{
      cardId: 'error-notification',
      card: {
        header: {
          title: '⚠️ Morning Intelligence Errors',
          subtitle: new Date().toISOString(),
          imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/error/default/48px.svg',
          imageType: 'CIRCLE',
        },
        sections: [{
          widgets: [
            text(`<font color="${C.red}"><b>Issues (${errors.length}):</b></font>\n${errors.map(e => `• ${e}`).join('\n')}\n\n<font color="${C.muted}"><i>Content may have been sent with fallbacks.</i></font>`),
          ],
        }],
      },
    }],
  }
}
