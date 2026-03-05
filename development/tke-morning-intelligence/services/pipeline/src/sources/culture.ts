/**
 * TKE Company Culture — Daily Fundamental Rotation
 *
 * Reads from TKE_Culture_Kernel.json and deterministically selects:
 * - Today's fundamental (6-day rotation based on date)
 * - One specific behavior from that fundamental (5-week sub-rotation)
 * - One anti-pattern to watch for
 * - The self-test question
 * - Occasionally a cultural language term
 *
 * No LLM needed — this is pure deterministic content from the culture system.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// ── Types ────────────────────────────────────────────────────

interface CultureFundamental {
  id: string
  number: number
  name: string
  mantra: string
  description: string
  behaviors: string[]
  anti_patterns: string[]
  test: string
}

interface CultureValue {
  id: string
  name: string
  description: string
  test: string
}

interface CulturalLanguageTerm {
  key: string
  definition: string
  usage: string
}

export interface DailyCulture {
  fundamental: {
    number: number
    name: string
    mantra: string
    todayBehavior: string
    watchOutFor: string
    selfCheck: string
  }
  culturalTerm?: {
    name: string
    definition: string
  }
}

// ── Kernel Data ──────────────────────────────────────────────

let kernel: {
  fundamentals: CultureFundamental[]
  values: CultureValue[]
  cultural_language: Record<string, { definition: string; usage: string }>
} | null = null

function loadKernel() {
  if (kernel) return kernel

  const kernelPath = join(process.cwd(), '..', '..', '..', '..', 'tke-culture', 'TKE_Culture_Kernel.json')
  try {
    const raw = readFileSync(kernelPath, 'utf-8')
    kernel = JSON.parse(raw)
    console.log(`[Culture] Loaded kernel with ${kernel!.fundamentals.length} fundamentals`)
    return kernel!
  } catch (err) {
    console.warn('[Culture] Could not load TKE_Culture_Kernel.json:', err instanceof Error ? err.message : err)
    // Fallback: inline the 6 fundamentals
    kernel = getFallbackKernel()
    return kernel
  }
}

// ── Daily Selection ──────────────────────────────────────────

/**
 * Get today's culture content based on date.
 * - Fundamental rotates on a 6-day cycle
 * - Behavior rotates on a 5-week sub-cycle within each fundamental
 * - Cultural language term shows every 3rd day
 */
export function getDailyCulture(isoDate: string): DailyCulture {
  const k = loadKernel()

  // Use the day-of-year to rotate through fundamentals
  const date = new Date(isoDate + 'T12:00:00')
  const dayOfYear = getDayOfYear(date)

  // 6-day rotation for fundamentals
  const fundamentalIndex = dayOfYear % 6
  const fundamental = k.fundamentals[fundamentalIndex]!

  // 5-behavior sub-rotation (changes weekly)
  const weekNumber = Math.floor(dayOfYear / 7)
  const behaviorIndex = weekNumber % fundamental.behaviors.length
  const antiPatternIndex = weekNumber % fundamental.anti_patterns.length

  // Cultural language term every 3rd day
  const termKeys = Object.keys(k.cultural_language)
  let culturalTerm: DailyCulture['culturalTerm'] = undefined
  if (dayOfYear % 3 === 0 && termKeys.length > 0) {
    const termIndex = Math.floor(dayOfYear / 3) % termKeys.length
    const key = termKeys[termIndex]!
    const term = k.cultural_language[key]!
    // Convert key like "flow_vs_friction" → "Flow vs. Friction"
    const name = key
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .replace('Vs ', 'vs. ')
    culturalTerm = { name, definition: term.definition }
  }

  return {
    fundamental: {
      number: fundamental.number,
      name: fundamental.name,
      mantra: fundamental.mantra,
      todayBehavior: fundamental.behaviors[behaviorIndex]!,
      watchOutFor: fundamental.anti_patterns[antiPatternIndex]!,
      selfCheck: fundamental.test,
    },
    culturalTerm,
  }
}

// ── Helpers ──────────────────────────────────────────────────

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getFallbackKernel() {
  return {
    fundamentals: [
      { id: 'direct_is_kind', number: 1, name: 'Direct is Kind', mantra: 'I speak for myself. I share my thought before questions. I describe without blame.', description: '', behaviors: ['Go directly to the person within 48 hours', 'Use "I" statements', 'Share the thought before the question', 'Describe without blame', 'Thank people for direct feedback'], anti_patterns: ['Complaining to a third party', 'Using "we think" to hide', 'Letting issues fester past 48 hours', 'Escalating before trying direct conversation', 'Asking accusatory questions'], test: 'Did I take the direct path, or did I avoid discomfort?' },
      { id: 'listen_first_then_act', number: 2, name: 'Listen First, Then Act', mantra: 'I understand before solving. I ask before assuming.', description: '', behaviors: ['Let people finish speaking', 'Ask clarifying questions first', 'Understand root causes before treating', 'Reflect back what I heard', 'Ask "what matters to you?"'], anti_patterns: ['Interrupting mid-sentence', 'Jumping to solutions', 'Assuming you know what someone needs', 'Treating symptoms not causes', 'Waiting to talk instead of listening'], test: 'Did I truly listen, or was I just waiting to talk?' },
      { id: 'fix_the_system_own_your_part', number: 3, name: 'Fix the System, Own Your Part', mantra: 'Every failure has system gaps AND personal lessons. I find both.', description: '', behaviors: ['Ask "What happened?" not "Who did this?"', 'Identify system gaps AND personal responsibility', 'Say "I own that" before being asked', 'Report friction to fix the system', 'Leadership owns broken promises'], anti_patterns: ['Blaming individuals when systems failed', 'Using "fix the system" to avoid accountability', 'Public shaming for mistakes', 'Waiting to be confronted', 'Ignoring systemic issues'], test: 'Did I fix the system AND own my part?' },
      { id: 'test_learn_evolve', number: 4, name: 'Test, Learn, Evolve', mantra: 'I run small experiments. I learn from everything. I adapt or I fall behind.', description: '', behaviors: ['Test new ideas with small pilots', 'Set clear success criteria BEFORE the test', 'Learn from both successes and failures', 'Identify ONE improvement each week', 'Embrace change as essential'], anti_patterns: ['Launching big initiatives without piloting', 'No clear success criteria', 'Repeating failed approaches', 'Resisting change', 'Over-planning instead of starting small'], test: 'Am I evolving with intention, or resisting necessary change?' },
      { id: 'unreasonable_hospitality', number: 5, name: 'Unreasonable Hospitality', mantra: 'I go beyond expected. AI = Memory. Humans = Heart.', description: '', behaviors: ['Remember personal details about patients', 'Call to check in after difficult visits', 'Explain in terms patients understand', 'Anticipate questions before asked', 'Make the environment feel warm'], anti_patterns: ['Treating interactions as transactions', 'Only doing what protocol requires', 'Failing to remember details', 'Using medical jargon without translation', 'Making patients feel like an assembly line'], test: 'Would this feel like family, or like a transaction?' },
      { id: 'ai_in_everything', number: 6, name: 'AI in Everything', mantra: 'If AI can do it, AI should. I ask "could AI help?" constantly.', description: '', behaviors: ['Ask "could AI help?" for every repetitive task', 'Use AI tools daily in your role', 'Share AI workflow discoveries', 'Verify AI outputs before acting', 'Suggest AI improvements for bottlenecks'], anti_patterns: ['Doing manually what AI could automate', 'Refusing to learn AI tools', 'Treating AI as a threat', 'Blindly trusting AI without verification', 'Keeping AI discoveries to yourself'], test: 'Could AI do this, or does it require my human judgment/empathy?' },
    ],
    values: [],
    cultural_language: {
      flow_vs_friction: { definition: 'We optimize for Flow. Chronic friction triggers system redesign—not punishment, but improvement.', usage: '"I\'m experiencing friction with X" triggers investigation.' },
      precision_hospitality: { definition: 'AI = Memory (data, preferences, patterns). Humans = Heart (empathy, judgment, connection).', usage: 'Internal reframe of Unreasonable Hospitality for the AI age.' },
      swiss_cheese_model: { definition: 'Failures result from multiple system gaps aligning, not single-point individual failures.', usage: 'Used in blameless post-mortems.' },
      carefrontation: { definition: 'A direct conversation about a difficult issue, delivered with genuine care. Care + Confrontation = Growth.', usage: 'The expected mode of difficult conversations at TKE.' },
      shared_fate: { definition: 'Team members\' success and failure are interconnected. Creates motivation for peer accountability.', usage: 'Core operating principle. Shared metrics create shared fate.' },
    },
  }
}
