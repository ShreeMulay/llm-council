/**
 * Exa search data source
 *
 * Replaces both Tavily (web search) and GNews (healthcare headlines).
 * Exa provides cleaner, more token-efficient results.
 *
 * Used for:
 * 1. Healthcare news headlines (replaces GNews)
 * 2. Nephrology history search for "On This Day" (replaces Tavily)
 * 3. (Phase 2) Fresh AI tools discovery
 */

import type { DailyContext, NewsArticle } from '../types'

interface ExaSearchResult {
  title: string
  url: string
  text?: string
  highlights?: string[]
  publishedDate?: string
  author?: string
  score: number
}

interface ExaSearchResponse {
  results: ExaSearchResult[]
}

export async function fetchNews(dateCtx: Pick<DailyContext, 'dateInfo'>): Promise<NewsArticle[]> {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) {
    console.warn('[Exa] EXA_API_KEY not set, skipping news fetch')
    return []
  }

  try {
    // Use highlights extraction for clean results (no nav/sidebar garbage)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const articles = await searchExa(
      'nephrology kidney disease clinical research news',
      5,
      apiKey,
      {
        startPublishedDate: sevenDaysAgo.toISOString().split('T')[0],
        useHighlights: true,
      },
    )

    return articles
      .filter(a => a.title && a.url)
      .map(a => ({
        title: a.title,
        description: a.highlights?.join(' ') ?? a.text?.substring(0, 200) ?? '',
        url: a.url,
        source: extractDomain(a.url),
        publishedAt: a.publishedDate,
      }))
  } catch (error) {
    console.error('[Exa] News fetch failed:', error)
    return []
  }
}

export async function searchNephrologyHistory(
  monthName: string,
  dayOfMonth: number,
  apiKey: string,
): Promise<string> {
  try {
    const results = await searchExa(
      `medical history ${monthName} ${dayOfMonth} nephrology kidney transplant dialysis`,
      10,
      apiKey,
    )

    // Combine top results into a context string for the LLM
    return results
      .slice(0, 5)
      .map(r => `${r.title}: ${(r.text ?? '').substring(0, 300)}`)
      .join('\n\n')
  } catch (error) {
    console.error('[Exa] Nephrology history search failed:', error)
    return ''
  }
}

interface SearchExaOptions {
  startPublishedDate?: string
  useHighlights?: boolean
}

async function searchExa(
  query: string,
  numResults: number,
  apiKey: string,
  options?: SearchExaOptions,
): Promise<ExaSearchResult[]> {
  // Build contents config: highlights for clean extraction, text as fallback
  const contents: Record<string, unknown> = options?.useHighlights
    ? {
        highlights: {
          numSentences: 3,
          highlightsPerUrl: 1,
          query,
        },
      }
    : {
        text: { max_characters: 1000 },
      }

  const body: Record<string, unknown> = {
    query,
    num_results: numResults,
    type: 'auto',
    use_autoprompt: true,
    contents,
  }

  if (options?.startPublishedDate) {
    body.start_published_date = options.startPublishedDate
  }

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Exa API returned ${response.status}: ${response.statusText}`)
  }

  const data = await response.json() as ExaSearchResponse
  return data.results ?? []
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'unknown'
  }
}
