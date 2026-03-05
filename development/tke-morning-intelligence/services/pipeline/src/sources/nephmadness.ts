/**
 * NephMadness 2026 data source
 *
 * Reads pre-seeded bracket data and determines today's matchup/region
 * based on the working day index within March 2026.
 *
 * Schedule:
 *   Days 1-8:   One region per day (introduce both teams)
 *   Days 9-16:  Matchup deep-dives (one region per day)
 *   Days 17-21: Cross-region predictions, semifinals, championship
 *
 * Only active during March 2026.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// ── Types ────────────────────────────────────────────────────

interface NephMadnessRegion {
  name: string
  teamA: string
  teamB: string
  writer: string
  committee: string
  url: string
  blurb: string
}

interface NephMadnessData {
  year: number
  name: string
  description: string
  bracket_url: string
  regions: NephMadnessRegion[]
}

export interface NephMadnessToday {
  /** Current phase: 'region' | 'matchup' | 'prediction' */
  phase: 'region' | 'matchup' | 'prediction'
  /** Working day number in March (1-based) */
  workingDay: number
  /** Total working days in the month */
  totalWorkingDays: number
  /** The region for today (null for prediction phase cross-region days) */
  region: NephMadnessRegion | null
  /** Phase description for the LLM prompt */
  phaseDescription: string
  /** Full bracket data for cross-region days */
  allRegions: NephMadnessRegion[]
  /** Bracket submission URL */
  bracketUrl: string
}

// ── Bracket data (loaded once) ──────────────────────────────

let _cachedData: NephMadnessData | null = null

function loadBracketData(): NephMadnessData | null {
  if (_cachedData) return _cachedData

  try {
    // Try project root first, then relative paths
    const paths = [
      join(process.cwd(), '..', '..', 'infra', 'seed', 'nephmadness-2026.json'),
      join(process.cwd(), 'infra', 'seed', 'nephmadness-2026.json'),
      '/home/shreemulay/ai_projects/development/tke-morning-intelligence/infra/seed/nephmadness-2026.json',
    ]

    for (const p of paths) {
      try {
        const raw = readFileSync(p, 'utf-8')
        _cachedData = JSON.parse(raw) as NephMadnessData
        console.log(`[NephMadness] Loaded bracket data from ${p}`)
        return _cachedData
      } catch {
        // Try next path
      }
    }

    console.warn('[NephMadness] No bracket data found')
    return null
  } catch (err) {
    console.warn('[NephMadness] Failed to load bracket data:', err)
    return null
  }
}

// ── Working day calculation ─────────────────────────────────

/**
 * Get all working days (Mon-Fri) in March 2026
 * Returns array of ISO date strings: ['2026-03-02', '2026-03-03', ...]
 */
function getMarchWorkingDays(): string[] {
  const days: string[] = []
  for (let d = 1; d <= 31; d++) {
    const date = new Date(2026, 2, d) // month is 0-indexed
    const dow = date.getDay()
    if (dow >= 1 && dow <= 5) {
      days.push(date.toISOString().split('T')[0]!)
    }
  }
  return days
}

// ── Main export ─────────────────────────────────────────────

/**
 * Get today's NephMadness content assignment.
 *
 * Returns null if:
 * - Not March 2026
 * - Today is a weekend
 * - Bracket data not found
 * - Working day exceeds the 21-day schedule
 */
export function getNephMadnessToday(isoDate: string): NephMadnessToday | null {
  // Only active in March 2026
  if (!isoDate.startsWith('2026-03')) return null

  const data = loadBracketData()
  if (!data) return null

  const workingDays = getMarchWorkingDays()
  const dayIndex = workingDays.indexOf(isoDate)

  // Not a working day or not found
  if (dayIndex === -1) return null

  const workingDay = dayIndex + 1 // 1-based

  // Beyond our 21-day schedule
  if (workingDay > 21) return null

  const regions = data.regions

  if (workingDay <= 8) {
    // Phase 1: Region introductions (1 region per day)
    const regionIdx = workingDay - 1
    return {
      phase: 'region',
      workingDay,
      totalWorkingDays: workingDays.length,
      region: regions[regionIdx] ?? null,
      phaseDescription: `Day ${workingDay}/21: Introduce the ${regions[regionIdx]?.name ?? 'unknown'} region — present both teams and what makes this matchup compelling.`,
      allRegions: regions,
      bracketUrl: data.bracket_url,
    }
  } else if (workingDay <= 16) {
    // Phase 2: Matchup deep-dives (same order, deeper analysis)
    const regionIdx = workingDay - 9
    return {
      phase: 'matchup',
      workingDay,
      totalWorkingDays: workingDays.length,
      region: regions[regionIdx] ?? null,
      phaseDescription: `Day ${workingDay}/21: Deep-dive into the ${regions[regionIdx]?.name ?? 'unknown'} matchup — compare evidence, strengths, and potential winner.`,
      allRegions: regions,
      bracketUrl: data.bracket_url,
    }
  } else {
    // Phase 3: Predictions & championship
    const predictionDescriptions: Record<number, string> = {
      17: 'Quarterfinal predictions — which 4 regions will advance?',
      18: 'Semifinal analysis — the Final Four matchups',
      19: 'Championship preview — the two strongest teams face off',
      20: 'Championship deep-dive — make your case for the winner',
      21: 'Final day! Last chance to submit brackets. Season wrap-up and key takeaways.',
    }

    return {
      phase: 'prediction',
      workingDay,
      totalWorkingDays: workingDays.length,
      region: null,
      phaseDescription: `Day ${workingDay}/21: ${predictionDescriptions[workingDay] ?? 'Cross-region analysis'}`,
      allRegions: regions,
      bracketUrl: data.bracket_url,
    }
  }
}
