import { Hono } from "hono";
import { serve } from "inngest/hono";
import { inngest } from "./client";
import { qualityGates } from "./functions/quality-gates";
import { dailySummary } from "./functions/daily-summary";
import { staleReminder } from "./functions/stale-reminder";
import { agnoSync } from "./functions/agno-sync";

/**
 * AI Factory Inngest Server
 * 
 * Serves Inngest functions via HTTP.
 * Run with: bun run serve.ts
 * 
 * Then start Inngest dev server:
 *   inngest-cli dev -u http://localhost:3000/api/inngest
 */

const app = new Hono();

// Inngest endpoint - handles function registration and execution
app.on(
  ["GET", "PUT", "POST"],
  "/api/inngest",
  serve({
    client: inngest,
    functions: [
      qualityGates,
      dailySummary,
      staleReminder,
      agnoSync,
    ],
  })
);

// Health check endpoint
app.get("/health", (c) => c.json({ 
  status: "ok",
  service: "ai-factory-inngest",
  timestamp: new Date().toISOString()
}));

// Home page with info
app.get("/", (c) => c.json({
  name: "AI Factory Inngest Server",
  endpoints: {
    inngest: "/api/inngest",
    health: "/health"
  },
  functions: [
    "quality-gates (triggered by git.push)",
    "daily-summary (cron: 9 AM weekdays)",
    "stale-reminder (cron: 10 AM Mondays)",
    "agno-sync (triggered by agno/lesson.updated)"
  ],
  usage: {
    start: "bun run serve.ts",
    devServer: "inngest-cli dev -u http://localhost:3000/api/inngest"
  }
}));

console.log("🚀 AI Factory Inngest Server starting on port 3000...");
console.log("📡 Inngest endpoint: http://localhost:3000/api/inngest");
console.log("❤️  Health check: http://localhost:3000/health");
console.log("");
console.log("Next: Run 'inngest-cli dev -u http://localhost:3000/api/inngest' in another terminal");

export default {
  port: 3000,
  fetch: app.fetch,
};
