/**
 * Google Chat Card Builder
 *
 * Formats content into cardsV2 format for Google Chat.
 * Handles three card types:
 * 1. Mindset (daily educational content)
 * 2. Operations (weather, calendar, news - weekdays only)
 * 3. Celebrations (birthdays, holidays, paydays)
 */

import { WEATHER_EMOJI } from '../sources/weather'
import { parseCelebrations, filterOperationsEvents } from '../sources/calendar'
import type { DailyContext, GenerateResponse, Medication, SystemsThinking, Quote, NephrologyHistory, DidYouKnow, AiIdeas } from '../types'

// ── Card Type ─────────────────────────────────────────────────
interface ChatCard {
  cardsV2: Array<{
    cardId: string
    card: {
      header: {
        title: string
        subtitle: string
        imageUrl: string
        imageType: string
      }
      sections: Array<{
        header: string
        widgets: Array<{ textParagraph: { text: string } }>
        collapsible?: boolean
      }>
    }
  }>
}

const PRACTICE_AVATAR = 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/nephrology/default/48px.svg'
const CELEBRATION_AVATAR = 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/celebration/default/48px.svg'

// ── Mindset Card ──────────────────────────────────────────────
export function buildMindsetCard(ctx: DailyContext, content: GenerateResponse): ChatCard {
  const { dateInfo, holidayInfo } = ctx
  let subtitle = dateInfo.formattedDate
  if (holidayInfo.todayHoliday) subtitle += `\n🎉 ${holidayInfo.todayHoliday}`
  if (holidayInfo.healthcareEvent) subtitle += `\n💜 ${holidayInfo.healthcareEvent}`
  if (holidayInfo.isPayday) subtitle += `\n💰 Payday! ${holidayInfo.paydayNote}`

  return {
    cardsV2: [{
      cardId: 'mindset',
      card: {
        header: {
          title: 'Good Morning, TKE Team!',
          subtitle,
          imageUrl: PRACTICE_AVATAR,
          imageType: 'CIRCLE',
        },
        sections: [
          // Each section is nullable — generators can fail individually.
          // Only include sections that have content.
          ...(content.systems_thinking ? [{ header: 'Systems Thinking', widgets: [{ textParagraph: { text: formatSystems(content.systems_thinking) } }], collapsible: false }] : []),
          ...(content.quote ? [{ header: 'Daily Wisdom', widgets: [{ textParagraph: { text: formatQuote(content.quote) } }], collapsible: true }] : []),
          ...(content.nephrology_history ? [{ header: 'On This Day', widgets: [{ textParagraph: { text: formatHistory(content.nephrology_history) } }], collapsible: true }] : []),
          ...(content.did_you_know ? [{ header: 'Did You Know?', widgets: [{ textParagraph: { text: formatDidYouKnow(content.did_you_know) } }], collapsible: true }] : []),
          ...(content.medication ? [{ header: 'Medication Spotlight', widgets: [{ textParagraph: { text: formatMedication(content.medication) } }], collapsible: true }] : []),
          ...(content.ai_ideas ? [{ header: 'AI Ideas', widgets: [{ textParagraph: { text: formatAiIdeas(content.ai_ideas) } }], collapsible: true }] : []),
        ].filter(s => s != null),
      },
    }],
  }
}

// ── Operations Card ───────────────────────────────────────────
export function buildOperationsCard(ctx: DailyContext): ChatCard {
  const { dateInfo, weather, calendarEvents, news } = ctx
  const opsEvents = filterOperationsEvents(calendarEvents)

  const weatherText = weather
    ? `${WEATHER_EMOJI[weather.icon] ?? '🌡️'} <b>Jackson, TN:</b> ${weather.temp}°F (feels ${weather.feels_like}°F) • ${weather.description} • 💧 ${weather.humidity}%`
    : '🌡️ <b>Weather:</b> Unable to fetch'

  const scheduleText = opsEvents.length > 0
    ? opsEvents.map(e => `• [${e.calendarName}] ${e.summary}`).join('\n')
    : '📅 No events scheduled'

  const newsText = news.length > 0
    ? news.slice(0, 3).map((a, i) => {
        const emoji = ['🔴', '🟠', '🟡'][i] ?? '⚪'
        let item = `${emoji} <b><a href="${a.url}">${a.title}</a></b>\n   <i>${a.source}</i>`
        if (a.description) {
          const desc = a.description.length > 120 ? a.description.substring(0, 117) + '...' : a.description
          item += `\n   ${desc}`
        }
        return item
      }).join('\n\n')
    : '📰 No healthcare news available'

  return {
    cardsV2: [{
      cardId: 'operations',
      card: {
        header: {
          title: "Today's Operations",
          subtitle: dateInfo.formattedDate,
          imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/calendar_today/default/48px.svg',
          imageType: 'CIRCLE',
        },
        sections: [
          { header: 'Weather', widgets: [{ textParagraph: { text: weatherText } }] },
          { header: 'Schedule', widgets: [{ textParagraph: { text: scheduleText } }] },
          { header: 'Healthcare News', widgets: [{ textParagraph: { text: newsText } }] },
        ],
      },
    }],
  }
}

// ── Celebrations Card ──────────────────────────────────────────
export function buildCelebrationCard(ctx: DailyContext): ChatCard | null {
  const { dateInfo, holidayInfo, calendarEvents } = ctx
  const { birthdays, anniversaries, newHires } = parseCelebrations(calendarEvents)

  const hasCelebrations = birthdays.length > 0 || anniversaries.length > 0 || newHires.length > 0
    || holidayInfo.todayHoliday || holidayInfo.healthcareEvent || holidayInfo.isPayday

  if (!hasCelebrations) return null

  let text = ''

  if (holidayInfo.todayHoliday) {
    text += `🎉 <b>Happy ${holidayInfo.todayHoliday}!</b>\nWishing the entire TKE team a wonderful holiday!\n\n`
  }

  if (holidayInfo.healthcareEvent) {
    text += `💜 <b>${holidayInfo.healthcareEvent}</b>\n`
    if (holidayInfo.healthcareEvent.includes('Kidney')) {
      text += 'A special time for our nephrology team! Let\'s spread awareness about kidney health.\n\n'
    } else {
      text += 'An important healthcare awareness observance.\n\n'
    }
  }

  if (holidayInfo.isPayday) {
    text += `💰 <b>Payday!</b>\n${holidayInfo.paydayNote}\n\n`
  }

  if (birthdays.length > 0) {
    text += '🎂 <b>Happy Birthday!</b>\n'
    birthdays.forEach(n => { text += `🎈 Wishing ${n} a wonderful birthday!\n` })
    text += '\n'
  }

  if (anniversaries.length > 0) {
    text += '🎉 <b>Work Anniversary!</b>\n'
    anniversaries.forEach(a => {
      text += `⭐ Congratulations to ${a.name} on ${a.years} year${a.years > 1 ? 's' : ''} with TKE!\n`
    })
    text += '\n'
  }

  if (newHires.length > 0) {
    text += '👋 <b>Welcome to the Team!</b>\n'
    newHires.forEach(n => { text += `🌟 Please welcome ${n} - today is their first day!\n` })
  }

  if (!text.trim()) return null

  return {
    cardsV2: [{
      cardId: 'celebration',
      card: {
        header: {
          title: 'Team Celebrations!',
          subtitle: dateInfo.formattedDate,
          imageUrl: CELEBRATION_AVATAR,
          imageType: 'CIRCLE',
        },
        sections: [{ header: '', widgets: [{ textParagraph: { text: text.trim() } }] }],
      },
    }],
  }
}

// ── Section Formatters ────────────────────────────────────────

function formatSystems(s: SystemsThinking): string {
  let text = `${s.emoji} <b>${s.concept}</b>\n\n`
  text += `<i>${s.coreIdea}</i>\n\n`
  text += `🏥 <b>In Nephrology:</b> ${s.nephrologyExample}\n\n`
  text += `🎯 <b>Today's Challenge:</b> ${s.todayChallenge}\n\n`
  text += `🤔 <b>Reflection:</b> ${s.reflectionQuestion}`
  return text
}

function formatQuote(q: Quote): string {
  let text = `💬 <i>"${q.quote}"</i>\n\n`
  text += `— <b>${q.author}</b>, ${q.authorRole}\n\n`
  text += `<i>${q.connectionToTheme}</i>`
  return text
}

function formatHistory(h: NephrologyHistory): string {
  let text = `${h.emoji} <b>${h.year}</b>\n\n`
  text += `${h.event}\n\n`
  text += `⭐ <b>Why it matters:</b> ${h.significance}\n\n`
  text += `🎲 <b>Fun fact:</b> ${h.funFact}`
  return text
}

function formatDidYouKnow(d: DidYouKnow): string {
  let text = `${d.emoji} <b>${d.category}</b>\n\n`
  text += `${d.fact}\n\n`
  text += `📚 <b>Source:</b> ${d.source}`
  return text
}

function formatMedication(m: Medication): string {
  let text = `${m.emoji} <b>${m.genericName}</b> (${m.brandName})\n`
  text += `<i>${m.drugClass}</i>\n\n`
  text += `🎯 <b>Use:</b> ${m.primaryUse}\n\n`
  text += `⚙️ <b>Mechanism:</b> ${m.howItWorks}\n\n`
  text += `🧪 <b>Renal Dosing:</b> ${m.renalDosing}\n\n`
  text += `💎 <b>Pearl:</b> ${m.pearlForPractice}\n\n`
  text += `⚠️ <b>Side Effects:</b> ${m.commonSideEffects.join(', ')}\n\n`
  text += `🗣️ <b>Counseling:</b> ${m.patientCounselingPoint}`
  return text
}

function formatAiIdeas(a: AiIdeas): string {
  let text = ''

  text += `🌱 <b>BEGINNER:</b> ${a.beginner.title}\n`
  text += `🔧 <b>Tool:</b> ${a.beginner.toolName} (${a.beginner.toolUrl})\n\n`
  text += `${a.beginner.emoji} <b>Prompt:</b>\n"${a.beginner.prompt}"\n\n`
  text += `✨ <b>Result:</b> ${a.beginner.expectedResult}\n`
  text += `⏱️ <b>Time saved:</b> ${a.beginner.timeSaved}\n`

  text += '\n---\n\n'

  text += `🚀 <b>POWER USER:</b> ${a.advanced.toolName}\n`
  text += `🔧 <a href="https://${a.advanced.toolUrl}">${a.advanced.toolUrl}</a>\n\n`
  text += `🏥 <b>Use:</b> ${a.advanced.useCase}\n\n`
  text += `▶️ <b>Start:</b> ${a.advanced.howToStart}\n\n`
  text += `💡 <b>Pro Tip:</b> ${a.advanced.proTip}`

  return text
}
