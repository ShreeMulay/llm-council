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
  text: string
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
    const articles = await searchExa(
      'healthcare nephrology kidney disease news',
      5,
      apiKey,
    )

    return articles.map(a => ({
      title: a.title,
      description: a.text.substring(0, 200),
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
      .map(r => `${r.title}: ${r.text.substring(0, 300)}`)
      .join('\n\n')
  } catch (error) {
    console.error('[Exa] Nephrology history search failed:', error)
    return ''
  }
}

async function searchExa(
  query: string,
  numResults: number,
  apiKey: string,
): Promise<ExaSearchResult[]> {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      num_results: numResults,
      type: 'auto',
      use_autoprompt: true,
      contents: {
        text: { max_characters: 1000 },
      },
    }),
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
