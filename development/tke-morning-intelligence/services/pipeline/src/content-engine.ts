/**
 * Content Engine HTTP client
 *
 * Makes POST calls to the content-engine FastAPI service to generate
 * all 6 daily content sections (systems thinking, quote, nephrology
 * history, AI ideas, did you know, medication spotlight).
 *
 * The content engine runs Vertex AI Gemini models in parallel and
 * returns validated content. Individual sections may be null if their
 * generator fails — we use a lenient (partial) Zod schema to handle this.
 */

import { z } from 'zod'
import type { DailyContext, GenerateResponse } from './types'
import {
  SystemsThinkingSchema,
  QuoteSchema,
  NephrologyHistorySchema,
  AiIdeasSchema,
  DidYouKnowSchema,
  MedicationSchema,
} from './types/content'

// ============================================
// Interfaces
// ============================================

interface DailyPlan {
  systems_concept: string
  medication: string
  dyk_category: string
  ai_beginner_topic: string
  ai_advanced_tool: { name: string; url: string }
}

interface DedupMemory {
  recent_quotes_authors: string[]
  recent_nephrology_events: string[]
}

// ============================================
// Configuration
// ============================================

const CONTENT_ENGINE_URL = process.env.CONTENT_ENGINE_URL || 'http://localhost:8000'
const CONTENT_ENGINE_TIMEOUT_MS = 120_000 // 2 minutes — LLM generation takes time

// ============================================
// Lenient response schema
// Each content section is nullable since individual generators can fail.
// The meta section is always present.
// ============================================

const LenientGenerateResponseSchema = z.object({
  systems_thinking: SystemsThinkingSchema.nullable().optional(),
  quote: QuoteSchema.nullable().optional(),
  nephrology_history: NephrologyHistorySchema.nullable().optional(),
  ai_ideas: AiIdeasSchema.nullable().optional(),
  did_you_know: DidYouKnowSchema.nullable().optional(),
  medication: MedicationSchema.nullable().optional(),
  meta: z.object({
    models_used: z.record(z.string()).default({}),
    generation_time_ms: z.number().default(0),
    validation_errors: z.array(z.string()).default([]),
  }),
})

type LenientGenerateResponse = z.infer<typeof LenientGenerateResponseSchema>

// ============================================
// Default theme mapping (Phase 1)
// ============================================

function getDefaultTheme(month: number): { monthly: string; weekly: string; daily_focus: string | null } {
  const monthlyThemes: Record<number, string> = {
    1: 'Thyroid Awareness Month',
    2: 'American Heart Month',
    3: 'National Kidney Month',
    4: 'Donate Life Month',
    5: 'Hypertension Awareness Month',
    6: 'Men\'s Health Month',
    7: 'UV Safety Month',
    8: 'Immunization Awareness Month',
    9: 'Healthy Aging Month',
    10: 'Health Literacy Month',
    11: 'Diabetes Awareness Month',
    12: 'Safe Toys and Gifts Month',
  }

  return {
    monthly: monthlyThemes[month] ?? 'General Nephrology',
    weekly: month === 3 ? 'CKD Awareness' : 'Clinical Excellence',
    daily_focus: null,
  }
}

// ============================================
// Request body builder
// ============================================

function buildRequestBody(
  plan: DailyPlan,
  memory: DedupMemory,
  context: DailyContext,
  medicationApiData?: Record<string, unknown> | null,
  nephrologySearchContext?: string | null,
) {
  const { dateInfo } = context
  const theme = getDefaultTheme(dateInfo.month)

  return {
    date_info: {
      month_name: dateInfo.monthName,
      day_of_month: dateInfo.dayOfMonth,
      month: dateInfo.month,
      year: dateInfo.year,
      iso_date: dateInfo.isoDate,
    },
    theme,
    assignments: {
      systems_concept: plan.systems_concept,
      medication: plan.medication,
      dyk_category: plan.dyk_category,
      ai_beginner_topic: plan.ai_beginner_topic,
      ai_advanced_tool: {
        name: plan.ai_advanced_tool.name,
        url: plan.ai_advanced_tool.url,
      },
    },
    memory: {
      recent_quotes_authors: memory.recent_quotes_authors,
      recent_nephrology_events: memory.recent_nephrology_events,
    },
    external_context: {
      nephrology_search: nephrologySearchContext ?? null,
      medication_api_data: medicationApiData ?? null,
    },
  }
}

// ============================================
// Main export
// ============================================

/**
 * Call the Content Engine /generate endpoint.
 *
 * Maps pipeline types to the content-engine request format, sends the
 * POST request with a 2-minute timeout, and validates the response
 * with a lenient Zod schema (individual sections may be null).
 *
 * @throws {ContentEngineError} on network, timeout, HTTP, or parse failures
 */
export async function callContentEngine(
  plan: DailyPlan,
  memory: DedupMemory,
  context: DailyContext,
  medicationApiData?: Record<string, unknown> | null,
  nephrologySearchContext?: string | null,
): Promise<GenerateResponse> {
  const url = `${CONTENT_ENGINE_URL}/generate`
  const requestBody = buildRequestBody(plan, memory, context, medicationApiData, nephrologySearchContext)
  const startTime = Date.now()

  console.log(`[${new Date().toISOString()}] [ContentEngine] POST ${url} for ${context.dateInfo.isoDate}`)

  // Set up timeout via AbortController
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CONTENT_ENGINE_TIMEOUT_MS)

  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    const elapsedMs = Date.now() - startTime

    if (error instanceof Error && error.name === 'AbortError') {
      console.error(
        `[${new Date().toISOString()}] [ContentEngine] Request timed out after ${elapsedMs}ms (limit: ${CONTENT_ENGINE_TIMEOUT_MS}ms)`,
      )
      throw new ContentEngineError(
        `Content Engine request timed out after ${CONTENT_ENGINE_TIMEOUT_MS}ms`,
        'TIMEOUT',
      )
    }

    console.error(
      `[${new Date().toISOString()}] [ContentEngine] Network error after ${elapsedMs}ms:`,
      error instanceof Error ? error.message : error,
    )
    throw new ContentEngineError(
      `Content Engine network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK',
    )
  } finally {
    clearTimeout(timeoutId)
  }

  const elapsedMs = Date.now() - startTime

  // Handle non-200 responses
  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorBody = await response.text()
      errorDetail = errorBody.substring(0, 500)
    } catch {
      errorDetail = '(could not read error body)'
    }

    console.error(
      `[${new Date().toISOString()}] [ContentEngine] HTTP ${response.status} after ${elapsedMs}ms: ${errorDetail}`,
    )
    throw new ContentEngineError(
      `Content Engine returned HTTP ${response.status}: ${errorDetail}`,
      'HTTP_ERROR',
      response.status,
    )
  }

  // Parse JSON response
  let rawData: unknown
  try {
    rawData = await response.json()
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] [ContentEngine] JSON parse error after ${elapsedMs}ms:`,
      error instanceof Error ? error.message : error,
    )
    throw new ContentEngineError(
      `Content Engine returned invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`,
      'PARSE_ERROR',
    )
  }

  // Validate with lenient Zod schema
  const parseResult = LenientGenerateResponseSchema.safeParse(rawData)

  if (!parseResult.success) {
    const issues = parseResult.error.issues
      .slice(0, 5)
      .map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')

    console.error(
      `[${new Date().toISOString()}] [ContentEngine] Validation failed after ${elapsedMs}ms: ${issues}`,
    )
    throw new ContentEngineError(
      `Content Engine response validation failed: ${issues}`,
      'VALIDATION_ERROR',
    )
  }

  const validated = parseResult.data

  // Count successful sections
  const sectionNames = [
    'systems_thinking',
    'quote',
    'nephrology_history',
    'ai_ideas',
    'did_you_know',
    'medication',
  ] as const

  const successfulSections = sectionNames.filter(
    name => validated[name] != null,
  )
  const failedSections = sectionNames.filter(
    name => validated[name] == null,
  )

  console.log(
    `[${new Date().toISOString()}] [ContentEngine] Response OK in ${elapsedMs}ms — ` +
    `${successfulSections.length}/${sectionNames.length} sections generated` +
    (failedSections.length > 0 ? ` (missing: ${failedSections.join(', ')})` : ''),
  )

  if (validated.meta.validation_errors.length > 0) {
    console.warn(
      `[${new Date().toISOString()}] [ContentEngine] Server-side validation errors:`,
      validated.meta.validation_errors,
    )
  }

  // Cast to GenerateResponse — the lenient schema allows nulls where the
  // strict GenerateResponse type expects values. Downstream consumers
  // (card builders) must handle potentially missing sections.
  return validated as unknown as GenerateResponse
}

// ============================================
// Error class
// ============================================

type ContentEngineErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'HTTP_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'

export class ContentEngineError extends Error {
  readonly code: ContentEngineErrorCode
  readonly statusCode?: number

  constructor(message: string, code: ContentEngineErrorCode, statusCode?: number) {
    super(message)
    this.name = 'ContentEngineError'
    this.code = code
    this.statusCode = statusCode
  }
}
