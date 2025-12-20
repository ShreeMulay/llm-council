import { Inngest } from "inngest";

/**
 * Inngest client for the AI Project Factory
 * 
 * Local development: No keys needed, just run `bun run dev`
 * Production: Add INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY env vars
 */
export const inngest = new Inngest({ 
  id: "ai-factory",
});
