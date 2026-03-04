/**
 * TKE Morning Intelligence - Pipeline Service
 *
 * Orchestrates the daily content generation pipeline:
 * 1. Compute date context (holidays, observances, payday)
 * 2. Read daily plan from thematic calendar (Firestore)
 * 3. Check dedup memory (Firestore)
 * 4. Fetch external data (weather, calendars, news, etc.)
 * 5. Call Content Engine for AI generation
 * 6. Validate all outputs
 * 7. Format Google Chat cards
 * 8. Deliver to Chat spaces
 * 9. Store to archive + update memory
 * 10. Log metrics
 *
 * Endpoints:
 *   POST /run          - Triggered by Cloud Scheduler via Pub/Sub
 *   POST /feedback     - Google Chat button click handler
 *   GET  /health       - Health check
 *   GET  /api/today    - Returns today's content (for dashboard)
 *   GET  /api/archive  - Returns archived content (for dashboard)
 */

import { runPipeline } from './pipeline'
import { initFirestore, getArchivedContent } from './firestore'

// Initialize Firestore on startup
initFirestore()

const PORT = parseInt(process.env.PORT ?? '8080')

const server = Bun.serve({
  port: PORT,
  // LLM content generation can take 30-60s. Bun's default is 10s.
  idleTimeout: 120,

  async fetch(req) {
    const url = new URL(req.url)

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return Response.json({ status: 'ok', service: 'pipeline', timestamp: new Date().toISOString() })
    }

    // Main pipeline trigger (from Cloud Scheduler via Pub/Sub push)
    if (url.pathname === '/run' && req.method === 'POST') {
      try {
        console.log(`[${new Date().toISOString()}] Pipeline triggered`)
        const result = await runPipeline()
        console.log(`[${new Date().toISOString()}] Pipeline completed in ${result.totalTimeMs}ms`)
        return Response.json({ success: true, ...result })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[${new Date().toISOString()}] Pipeline failed:`, message)
        return Response.json({ success: false, error: message }, { status: 500 })
      }
    }

    // Google Chat button feedback handler
    if (url.pathname === '/feedback' && req.method === 'POST') {
      try {
        const body = await req.json()
        // TODO: Phase 3 - Parse Chat interaction event, store feedback
        console.log(`[${new Date().toISOString()}] Feedback received:`, JSON.stringify(body))
        return Response.json({ success: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ success: false, error: message }, { status: 500 })
      }
    }

    // Dashboard API: Today's content
    if (url.pathname === '/api/today' && req.method === 'GET') {
      try {
        const today = new Date().toISOString().split('T')[0]!
        const content = await getArchivedContent(today)
        if (!content) {
          return Response.json({ message: 'No content for today yet' }, { status: 404 })
        }
        return Response.json(content)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: message }, { status: 500 })
      }
    }

    // Dashboard API: Archive
    if (url.pathname === '/api/archive' && req.method === 'GET') {
      try {
        const date = url.searchParams.get('date')
        if (!date) {
          return Response.json({ error: 'date query parameter required (YYYY-MM-DD)' }, { status: 400 })
        }
        const content = await getArchivedContent(date)
        if (!content) {
          return Response.json({ message: `No content for ${date}` }, { status: 404 })
        }
        return Response.json(content)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: message }, { status: 500 })
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  },
})

console.log(`Pipeline service running on port ${server.port}`)
