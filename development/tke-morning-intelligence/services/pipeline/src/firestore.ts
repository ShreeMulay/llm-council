/**
 * Firestore client module for TKE Morning Intelligence pipeline
 *
 * Manages all Firestore reads/writes:
 *   - master-lists: Systems concepts, DYK categories, AI tools
 *   - pharmacopoeia: Medication documents keyed by generic name
 *   - content-memory: Dedup tracking for recently used items
 *   - content-archive: Daily content archive keyed by ISO date
 *   - settings: App configuration
 */

import { Firestore } from '@google-cloud/firestore'

// ============================================
// Interfaces
// ============================================

interface MasterListItem {
  name: string
  description: string
  cooldownDays: number
  lastUsedDate: string | null
}

interface BeginnerTopic {
  topic: string
  cooldownDays: number
  lastUsedDate: string | null
}

interface AdvancedTool {
  name: string
  url: string
  description: string
  cooldownDays: number
  lastUsedDate: string | null
}

interface MasterListsConfig {
  systemsConcepts: MasterListItem[]
  dykCategories: MasterListItem[]
  aiTools: {
    beginnerTopics: BeginnerTopic[]
    advancedTools: AdvancedTool[]
  }
}

export interface DailyPlan {
  systems_concept: string
  medication: string
  dyk_category: string
  ai_beginner_topic: string
  ai_advanced_tool: { name: string; url: string }
}

export interface DedupMemory {
  recent_quotes_authors: string[]
  recent_nephrology_events: string[]
}

interface ContentArchiveEntry {
  content: unknown
  context: unknown
  isoDate: string
  archivedAt: string
  metadata: {
    service: string
    version: string
  }
}

// ============================================
// Firestore initialization
// ============================================

let db: Firestore | null = null

export function initFirestore(): void {
  db = new Firestore({
    projectId: process.env.GCP_PROJECT_ID,
    databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
  })
  console.log(`[${new Date().toISOString()}] [Firestore] Initialized (project: ${process.env.GCP_PROJECT_ID}, database: ${process.env.FIRESTORE_DATABASE_ID || '(default)'})`)
}

export function getDb(): Firestore {
  if (!db) {
    throw new Error('Firestore not initialized. Call initFirestore() first.')
  }
  return db
}

// ============================================
// Collection references
// ============================================

const COLLECTIONS = {
  MASTER_LISTS: 'master-lists',
  PHARMACOPOEIA: 'pharmacopoeia',
  CONTENT_MEMORY: 'content-memory',
  CONTENT_ARCHIVE: 'content-archive',
  SETTINGS: 'settings',
} as const

// ============================================
// Deterministic random selection
// ============================================

/**
 * Simple hash-based seed from an ISO date string.
 * Same date always produces the same sequence, useful for retries.
 */
function dateToSeed(isoDate: string): number {
  let hash = 0
  for (let i = 0; i < isoDate.length; i++) {
    const char = isoDate.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces deterministic values in [0, 1).
 */
function seededRandom(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Pick a random item from an array using a seeded RNG.
 * Advances the RNG state so subsequent picks are different.
 */
function seededPick<T>(items: T[], rng: () => number): T {
  const index = Math.floor(rng() * items.length)
  return items[index] as T
}

// ============================================
// Cooldown filtering
// ============================================

/**
 * Returns true if the item is available (cooldown has expired or was never used).
 */
function isOffCooldown(lastUsedDate: string | null, cooldownDays: number, today: string): boolean {
  if (!lastUsedDate) return true

  const lastUsed = new Date(lastUsedDate)
  const todayDate = new Date(today)
  const diffMs = todayDate.getTime() - lastUsed.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  return diffDays >= cooldownDays
}

/**
 * Filter items by cooldown. If all items are on cooldown, return the full list
 * and log a warning (graceful degradation).
 */
function filterByCooldown<T extends { cooldownDays: number; lastUsedDate: string | null }>(
  items: T[],
  today: string,
  listName: string,
): T[] {
  const available = items.filter(item => isOffCooldown(item.lastUsedDate, item.cooldownDays, today))

  if (available.length === 0) {
    console.warn(`[${new Date().toISOString()}] [Firestore] All items in "${listName}" are on cooldown. Resetting to full list.`)
    return items
  }

  return available
}

// ============================================
// getDailyPlan
// ============================================

/**
 * Build the daily content plan by randomly selecting from master lists.
 *
 * Phase 1: Random selection with cooldown filtering.
 * Phase 2 will add thematic calendar support.
 *
 * Uses date-seeded RNG so retries on the same day produce the same plan.
 */
export async function getDailyPlan(isoDate: string): Promise<DailyPlan> {
  const firestore = getDb()
  const startTime = Date.now()

  // 1. Read master-lists/config
  const masterDoc = await firestore
    .collection(COLLECTIONS.MASTER_LISTS)
    .doc('config')
    .get()

  if (!masterDoc.exists) {
    throw new Error('master-lists/config document not found. Run seed script first.')
  }

  const masterData = masterDoc.data() as MasterListsConfig

  // 2. Create seeded RNG for deterministic selection
  const rng = seededRandom(dateToSeed(isoDate))

  // 3. Filter each list by cooldown
  const availableConcepts = filterByCooldown(masterData.systemsConcepts, isoDate, 'systemsConcepts')
  const availableDyk = filterByCooldown(masterData.dykCategories, isoDate, 'dykCategories')
  const availableBeginnerTopics = filterByCooldown(masterData.aiTools.beginnerTopics, isoDate, 'aiTools.beginnerTopics')
  const availableAdvancedTools = filterByCooldown(masterData.aiTools.advancedTools, isoDate, 'aiTools.advancedTools')

  // 4. Select one from each list
  const selectedConcept = seededPick(availableConcepts, rng)
  const selectedDyk = seededPick(availableDyk, rng)
  const selectedBeginnerTopic = seededPick(availableBeginnerTopics, rng)
  const selectedAdvancedTool = seededPick(availableAdvancedTools, rng)

  // 5. Select medication from pharmacopoeia collection
  // For Phase 1, pick a random medication document
  const medsSnapshot = await firestore
    .collection(COLLECTIONS.PHARMACOPOEIA)
    .limit(100)
    .get()

  let medicationName = 'lisinopril' // fallback
  if (!medsSnapshot.empty) {
    const medDocs = medsSnapshot.docs
    const selectedMedDoc = seededPick(medDocs, rng)
    medicationName = selectedMedDoc.id
  } else {
    console.warn(`[${new Date().toISOString()}] [Firestore] No medications in pharmacopoeia. Using fallback.`)
  }

  const plan: DailyPlan = {
    systems_concept: selectedConcept.name,
    medication: medicationName,
    dyk_category: selectedDyk.name,
    ai_beginner_topic: selectedBeginnerTopic.topic,
    ai_advanced_tool: {
      name: selectedAdvancedTool.name,
      url: selectedAdvancedTool.url,
    },
  }

  console.log(`[${new Date().toISOString()}] [Firestore] Daily plan for ${isoDate} built in ${Date.now() - startTime}ms:`, JSON.stringify(plan))
  return plan
}

// ============================================
// getDedupMemory
// ============================================

/**
 * Read the dedup memory document to know what content has been used recently.
 * Returns empty arrays if the document doesn't exist yet.
 */
export async function getDedupMemory(): Promise<DedupMemory> {
  const firestore = getDb()

  const doc = await firestore
    .collection(COLLECTIONS.CONTENT_MEMORY)
    .doc('dedup')
    .get()

  if (!doc.exists) {
    console.log(`[${new Date().toISOString()}] [Firestore] No dedup memory found. Starting fresh.`)
    return {
      recent_quotes_authors: [],
      recent_nephrology_events: [],
    }
  }

  const data = doc.data() as Record<string, unknown>

  return {
    recent_quotes_authors: Array.isArray(data.recent_quotes_authors)
      ? (data.recent_quotes_authors as string[])
      : [],
    recent_nephrology_events: Array.isArray(data.recent_nephrology_events)
      ? (data.recent_nephrology_events as string[])
      : [],
  }
}

// ============================================
// getMedication
// ============================================

/**
 * Retrieve a medication document from the pharmacopoeia collection.
 * Documents are keyed by generic name (lowercase).
 * Returns null if the medication is not found.
 */
export async function getMedication(genericName: string): Promise<Record<string, unknown> | null> {
  const firestore = getDb()

  const doc = await firestore
    .collection(COLLECTIONS.PHARMACOPOEIA)
    .doc(genericName.toLowerCase())
    .get()

  if (!doc.exists) {
    console.log(`[${new Date().toISOString()}] [Firestore] Medication "${genericName}" not found in pharmacopoeia.`)
    return null
  }

  return doc.data() as Record<string, unknown>
}

// ============================================
// archiveContent
// ============================================

/**
 * Archive the day's generated content and context to Firestore.
 * Document is keyed by ISO date for easy retrieval.
 */
export async function archiveContent(
  isoDate: string,
  content: unknown,
  context: unknown,
): Promise<void> {
  const firestore = getDb()
  const startTime = Date.now()

  const entry: ContentArchiveEntry = {
    content,
    context,
    isoDate,
    archivedAt: new Date().toISOString(),
    metadata: {
      service: 'pipeline',
      version: '1.0.0',
    },
  }

  await firestore
    .collection(COLLECTIONS.CONTENT_ARCHIVE)
    .doc(isoDate)
    .set(entry)

  console.log(`[${new Date().toISOString()}] [Firestore] Archived content for ${isoDate} in ${Date.now() - startTime}ms`)
}

// ============================================
// updateDedupMemory
// ============================================

/** Maximum number of recent items to keep in dedup lists */
const DEDUP_LIST_MAX = 30

/**
 * Update dedup memory and master list lastUsedDate fields after content delivery.
 *
 * 1. Appends today's quote author and nephrology event to dedup lists (capped at 30).
 * 2. Sets lastUsedDate on the master-lists items that were used today.
 *
 * Uses a Firestore batch write to update multiple documents atomically.
 */
export async function updateDedupMemory(
  plan: DailyPlan,
  content: Record<string, unknown>,
  isoDate: string,
): Promise<void> {
  const firestore = getDb()
  const startTime = Date.now()
  const batch = firestore.batch()

  // ── Update content-memory/dedup ──────────────────────────
  const dedupRef = firestore.collection(COLLECTIONS.CONTENT_MEMORY).doc('dedup')
  const dedupDoc = await dedupRef.get()
  const existingDedup = dedupDoc.exists
    ? (dedupDoc.data() as Record<string, unknown>)
    : {}

  const recentAuthors = Array.isArray(existingDedup.recent_quotes_authors)
    ? [...(existingDedup.recent_quotes_authors as string[])]
    : []
  const recentEvents = Array.isArray(existingDedup.recent_nephrology_events)
    ? [...(existingDedup.recent_nephrology_events as string[])]
    : []

  // Extract author and event from generated content
  const quoteSection = content.quote as Record<string, unknown> | undefined
  const historySection = content.nephrology_history as Record<string, unknown> | undefined

  if (quoteSection?.author && typeof quoteSection.author === 'string') {
    recentAuthors.push(quoteSection.author)
  }
  if (historySection?.event && typeof historySection.event === 'string') {
    recentEvents.push(historySection.event)
  }

  // Cap lists at DEDUP_LIST_MAX
  const trimmedAuthors = recentAuthors.slice(-DEDUP_LIST_MAX)
  const trimmedEvents = recentEvents.slice(-DEDUP_LIST_MAX)

  batch.set(dedupRef, {
    recent_quotes_authors: trimmedAuthors,
    recent_nephrology_events: trimmedEvents,
    lastUpdated: isoDate,
  })

  // ── Update master-lists lastUsedDate for used items ──────
  const masterRef = firestore.collection(COLLECTIONS.MASTER_LISTS).doc('config')
  const masterDoc = await masterRef.get()

  if (masterDoc.exists) {
    const masterData = masterDoc.data() as MasterListsConfig

    // Update systemsConcepts
    const updatedConcepts = masterData.systemsConcepts.map(item =>
      item.name === plan.systems_concept
        ? { ...item, lastUsedDate: isoDate }
        : item,
    )

    // Update dykCategories
    const updatedDyk = masterData.dykCategories.map(item =>
      item.name === plan.dyk_category
        ? { ...item, lastUsedDate: isoDate }
        : item,
    )

    // Update beginnerTopics
    const updatedBeginnerTopics = masterData.aiTools.beginnerTopics.map(item =>
      item.topic === plan.ai_beginner_topic
        ? { ...item, lastUsedDate: isoDate }
        : item,
    )

    // Update advancedTools
    const updatedAdvancedTools = masterData.aiTools.advancedTools.map(item =>
      item.name === plan.ai_advanced_tool.name
        ? { ...item, lastUsedDate: isoDate }
        : item,
    )

    batch.update(masterRef, {
      systemsConcepts: updatedConcepts,
      dykCategories: updatedDyk,
      'aiTools.beginnerTopics': updatedBeginnerTopics,
      'aiTools.advancedTools': updatedAdvancedTools,
    })
  }

  // ── Commit batch ─────────────────────────────────────────
  await batch.commit()

  console.log(`[${new Date().toISOString()}] [Firestore] Updated dedup memory and master lists for ${isoDate} in ${Date.now() - startTime}ms`)
}

// ============================================
// getArchivedContent
// ============================================

/**
 * Retrieve archived content for a specific date.
 * Used by /api/today and /api/archive endpoints.
 * Returns null if no content exists for that date.
 */
export async function getArchivedContent(isoDate: string): Promise<Record<string, unknown> | null> {
  const firestore = getDb()

  const doc = await firestore
    .collection(COLLECTIONS.CONTENT_ARCHIVE)
    .doc(isoDate)
    .get()

  if (!doc.exists) {
    console.log(`[${new Date().toISOString()}] [Firestore] No archived content for ${isoDate}`)
    return null
  }

  return doc.data() as Record<string, unknown>
}
