/**
 * Main pipeline orchestration
 *
 * Coordinates the full morning content generation flow:
 *   date context → plan lookup → dedup check → data fetch →
 *   content generation → validation → formatting → delivery → archive
 */

import { computeDateContext } from './sources/date-context'
import { fetchWeather } from './sources/weather'
import { fetchCalendarEvents } from './sources/calendar'
import { fetchNews } from './sources/exa'
import { buildMindsetCard, buildOperationsCard, buildCelebrationCard } from './cards/builder'
import { deliverToChat } from './cards/delivery'
import { getDailyPlan, getDedupMemory, getMedication, archiveContent, updateDedupMemory } from './firestore'
import { callContentEngine } from './content-engine'
import type { DailyContext, GenerateResponse } from './types'

interface PipelineResult {
  totalTimeMs: number
  sections: string[]
  delivered: string[]
  errors: string[]
}

export async function runPipeline(): Promise<PipelineResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const delivered: string[] = []

  // ── Step 1: Date Context ──────────────────────────────────
  const dateCtx = computeDateContext()
  console.log(`[Pipeline] Date: ${dateCtx.dateInfo.formattedDate}`)

  // ── Step 2: Read Daily Plan from Master Lists ─────────────
  // Phase 1: Random selection filtered by cooldown
  // Phase 2: Will read from thematic-calendar collection
  let dailyPlan
  try {
    dailyPlan = await getDailyPlan(dateCtx.dateInfo.isoDate)
    console.log(`[Pipeline] Plan: concept=${dailyPlan.systems_concept}, med=${dailyPlan.medication}`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to get daily plan'
    console.error(`[Pipeline] Daily plan error:`, msg)
    errors.push(`Daily Plan: ${msg}`)
    // Cannot proceed without a plan
    return {
      totalTimeMs: Date.now() - startTime,
      sections: [],
      delivered: [],
      errors,
    }
  }

  // ── Step 3: Check Dedup Memory ────────────────────────────
  let dedupMemory
  try {
    dedupMemory = await getDedupMemory()
  } catch (error) {
    console.warn(`[Pipeline] Dedup memory read failed, using empty:`, error)
    dedupMemory = { recent_quotes_authors: [], recent_nephrology_events: [] }
  }

  // ── Step 4: Fetch External Data (parallel) ────────────────
  const [weather, calendarEvents, news, medicationData] = await Promise.allSettled([
    fetchWeather(),
    fetchCalendarEvents(),
    fetchNews(dateCtx),
    getMedication(dailyPlan.medication),
  ])

  const dailyContext: DailyContext = {
    dateInfo: dateCtx.dateInfo,
    holidayInfo: dateCtx.holidayInfo,
    weather: weather.status === 'fulfilled' ? weather.value : null,
    calendarEvents: calendarEvents.status === 'fulfilled' ? calendarEvents.value : [],
    news: news.status === 'fulfilled' ? news.value : [],
  }

  // Log any fetch failures (non-critical)
  if (weather.status === 'rejected') errors.push(`Weather: ${weather.reason}`)
  if (calendarEvents.status === 'rejected') errors.push(`Calendar: ${calendarEvents.reason}`)
  if (news.status === 'rejected') errors.push(`News: ${news.reason}`)
  if (medicationData.status === 'rejected') errors.push(`Medication data: ${medicationData.reason}`)

  // ── Step 5: Call Content Engine ───────────────────────────
  const medApiData = medicationData.status === 'fulfilled' ? medicationData.value : null
  const nephSearchCtx = news.status === 'fulfilled' && news.value.length > 0
    ? news.value.map(n => `${n.title}: ${n.description ?? ''}`).join('\n')
    : null

  let content: GenerateResponse | null = null
  try {
    content = await callContentEngine(
      dailyPlan,
      dedupMemory,
      dailyContext,
      medApiData,
      nephSearchCtx,
    )
    const sectionCount = Object.entries(content)
      .filter(([k, v]) => k !== 'meta' && v != null)
      .length
    console.log(`[Pipeline] Content generated: ${sectionCount}/6 sections`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Content generation failed'
    errors.push(`Content Engine: ${msg}`)
    console.error(`[Pipeline] Content Engine error:`, msg)
  }

  // ── Step 6: Format Chat Cards ─────────────────────────────
  if (content) {
    const mindsetCard = buildMindsetCard(dailyContext, content)
    const operationsCard = buildOperationsCard(dailyContext)
    const celebrationCard = buildCelebrationCard(dailyContext)

    // ── Step 7: Deliver ───────────────────────────────────────
    try {
      await deliverToChat('mindset', mindsetCard)
      delivered.push('mindset')
    } catch (e) {
      errors.push(`Deliver mindset: ${e instanceof Error ? e.message : 'failed'}`)
    }

    if (!dailyContext.dateInfo.isWeekend) {
      try {
        // Small delay between messages
        await Bun.sleep(5000)
        await deliverToChat('operations', operationsCard)
        delivered.push('operations')
      } catch (e) {
        errors.push(`Deliver operations: ${e instanceof Error ? e.message : 'failed'}`)
      }
    }

    if (celebrationCard) {
      try {
        await deliverToChat('celebrations', celebrationCard)
        delivered.push('celebrations')
      } catch (e) {
        errors.push(`Deliver celebrations: ${e instanceof Error ? e.message : 'failed'}`)
      }
    }

    // ── Step 8: Archive + Update Memory ─────────────────────
    try {
      await archiveContent(dateCtx.dateInfo.isoDate, content, dailyContext)
      await updateDedupMemory(dailyPlan, content as unknown as Record<string, unknown>, dateCtx.dateInfo.isoDate)
      console.log(`[Pipeline] Archived and updated memory for ${dateCtx.dateInfo.isoDate}`)
    } catch (e) {
      errors.push(`Archive: ${e instanceof Error ? e.message : 'failed'}`)
    }
  }

  // ── Step 9: Error Notification ──────────────────────────
  if (errors.length > 0) {
    console.warn(`[Pipeline] Completed with ${errors.length} errors:`, errors)
    try {
      await deliverToChat('errors', buildErrorCard(errors))
    } catch {
      console.error('[Pipeline] Failed to send error notification')
    }
  }

  const result: PipelineResult = {
    totalTimeMs: Date.now() - startTime,
    sections: content ? Object.keys(content).filter(k => k !== 'meta' && (content as Record<string, unknown>)[k] != null) : [],
    delivered,
    errors,
  }

  console.log(`[Pipeline] Done in ${result.totalTimeMs}ms | sections=${result.sections.length} | delivered=${result.delivered.length} | errors=${result.errors.length}`)
  return result
}

// ── Error card builder ─────────────────────────────────────

function buildErrorCard(errors: string[]) {
  return {
    cardsV2: [{
      cardId: 'error-notification',
      card: {
        header: {
          title: 'Morning Intelligence Errors',
          subtitle: new Date().toISOString(),
          imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/error/default/48px.svg',
          imageType: 'CIRCLE',
        },
        sections: [{
          widgets: [{
            textParagraph: {
              text: `<b>Issues (${errors.length}):</b>\n${errors.map(e => `• ${e}`).join('\n')}\n\n<i>Content may have been sent with fallbacks.</i>`,
            },
          }],
        }],
      },
    }],
  }
}
