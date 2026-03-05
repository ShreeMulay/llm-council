import { z } from 'zod'

// ============================================
// Shared content schemas with Zod validation
// These mirror the Pydantic models in content-engine
// ============================================

export const SystemsThinkingSchema = z.object({
  concept: z.string().min(1),
  emoji: z.string().min(1).max(4),
  coreIdea: z.string().min(10),
  nephrologyExample: z.string().min(20),
  todayChallenge: z.string().min(10),
  reflectionQuestion: z.string().min(10),
})

export const QuoteSchema = z.object({
  quote: z.string().min(10),
  author: z.string().min(2),
  authorRole: z.string().min(2),
  source: z.string().min(2),
  connectionToTheme: z.string().min(10),
})

export const NephrologyHistorySchema = z.object({
  event: z.string().min(10),
  year: z.string().regex(/^\d{4}$/),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  emoji: z.string().min(1).max(4),
  significance: z.string().min(10),
  funFact: z.string().min(10),
})

export const AiBeginnerSchema = z.object({
  title: z.string().min(5),
  toolName: z.literal('ChatGPT'),
  toolUrl: z.literal('chat.openai.com'),
  emoji: z.string().min(1).max(4),
  prompt: z.string().min(10),
  expectedResult: z.string().min(10),
  timeSaved: z.string().min(3),
})

export const AiAdvancedSchema = z.object({
  toolName: z.string().min(2),
  toolUrl: z.string().min(4),
  emoji: z.string().min(1).max(4),
  useCase: z.string().min(10),
  howToStart: z.string().min(10),
  proTip: z.string().min(10),
})

export const AiIdeasSchema = z.object({
  beginner: AiBeginnerSchema,
  advanced: AiAdvancedSchema,
})

export const DidYouKnowSchema = z.object({
  category: z.string().min(3),
  emoji: z.string().min(1).max(4),
  fact: z.string().min(20),
  source: z.string().min(3),
  whyItMatters: z.string().min(10),
})

export const MedicationSchema = z.object({
  genericName: z.string().min(3),
  brandName: z.string().min(2),
  drugClass: z.string().min(3),
  emoji: z.string().default('💊'),
  primaryUse: z.string().min(10),
  howItWorks: z.string().min(20),
  renalDosing: z.string().min(10),
  pearlForPractice: z.string().min(10),
  commonSideEffects: z.array(z.string()).min(3).max(6),
  patientCounselingPoint: z.string().min(10),
})

// ============================================
// Content generation request/response
// ============================================

export const GenerateRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  theme: z.object({
    monthly: z.string(),
    weekly: z.string(),
    daily_focus: z.string().optional(),
  }),
  assignments: z.object({
    systems_concept: z.string(),
    medication: z.string(),
    dyk_category: z.string(),
    ai_beginner_topic: z.string(),
    ai_advanced_tool: z.object({
      name: z.string(),
      url: z.string(),
    }),
  }),
  memory: z.object({
    recent_quotes_authors: z.array(z.string()),
    recent_nephrology_events: z.array(z.string()),
  }),
  external_context: z.object({
    nephrology_search: z.string().optional(),
    medication_api_data: z.record(z.unknown()).optional(),
  }).optional(),
})

export const GenerateResponseSchema = z.object({
  systems_thinking: SystemsThinkingSchema,
  quote: QuoteSchema,
  nephrology_history: NephrologyHistorySchema,
  ai_ideas: AiIdeasSchema,
  did_you_know: DidYouKnowSchema,
  medication: MedicationSchema,
  meta: z.object({
    models_used: z.record(z.string()),
    generation_time_ms: z.number(),
    validation_errors: z.array(z.string()),
  }),
})

// ============================================
// Type exports
// ============================================

export type SystemsThinking = z.infer<typeof SystemsThinkingSchema>
export type Quote = z.infer<typeof QuoteSchema>
export type NephrologyHistory = z.infer<typeof NephrologyHistorySchema>
export type AiBeginner = z.infer<typeof AiBeginnerSchema>
export type AiAdvanced = z.infer<typeof AiAdvancedSchema>
export type AiIdeas = z.infer<typeof AiIdeasSchema>
export type DidYouKnow = z.infer<typeof DidYouKnowSchema>
export type Medication = z.infer<typeof MedicationSchema>
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>
