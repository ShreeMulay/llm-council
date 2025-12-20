# AI Factory Inngest

This directory contains the Inngest infrastructure for the AI Project Factory.

## What is Inngest?

Inngest is an event-driven workflow platform that handles:
- **Durable execution** - Functions that survive failures and retries
- **Background jobs** - Long-running tasks outside the request path
- **Scheduled jobs** - Cron-based recurring tasks
- **Event-driven workflows** - React to git commits, pushes, etc.

## Quick Start

```bash
# Terminal 1: Start the Inngest server
cd ~/ai_projects/inngest
bun install
bun run serve

# Terminal 2: Start the Inngest dev server (dashboard)
inngest-cli dev -u http://localhost:3000/api/inngest
```

Open http://localhost:8288 to see the Inngest dashboard.

## Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `quality-gates` | `git.push` event | Runs lint, test, typecheck on push |
| `daily-summary` | Cron: 9 AM weekdays | Reports factory status |
| `stale-reminder` | Cron: 10 AM Mondays | Alerts on issues >14 days old |

## Events

Events are emitted by git hooks in factory projects:

| Event | Emitted By | Data |
|-------|------------|------|
| `git.commit` | post-commit hook | project, sha, message |
| `git.push` | pre-push hook | project, branch, commits |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Project Factory                            │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Git Hooks    │───▶│ Inngest      │───▶│ Functions    │       │
│  │ (emit events)│    │ Event Bus    │    │ (execute)    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  Events:                Functions:                               │
│  - git.commit           - quality-gates                          │
│  - git.push             - daily-summary                          │
│  - beads.sync           - stale-reminder                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Adding New Functions

1. Create a new file in `functions/`:

```typescript
import { inngest } from "../client";

export const myFunction = inngest.createFunction(
  { id: "my-function" },
  { event: "my.event" },  // or { cron: "0 * * * *" }
  async ({ event, step }) => {
    // Use step.run() for durable execution
    const result = await step.run("step-name", async () => {
      // This will retry on failure
      return doSomething();
    });
    
    return { result };
  }
);
```

2. Add it to `serve.ts`:

```typescript
import { myFunction } from "./functions/my-function";

// Add to functions array
functions: [
  qualityGates,
  dailySummary,
  staleReminder,
  myFunction,  // Add here
],
```

3. Restart the server.

## Sending Test Events

You can send events manually via curl:

```bash
curl -X POST http://localhost:8288/e/dev \
  -H "Content-Type: application/json" \
  -d '{
    "name": "git.push",
    "data": {
      "project": "my-project",
      "branch": "main",
      "commits": 3
    }
  }'
```

## Production Deployment

When ready to move to production:

1. Sign up at https://www.inngest.com
2. Get your signing and event keys
3. Set environment variables:
   ```bash
   export INNGEST_SIGNING_KEY=your-signing-key
   export INNGEST_EVENT_KEY=your-event-key
   ```
4. Deploy to your hosting platform (Vercel, Fly, etc.)

## Troubleshooting

**Functions not appearing in dashboard?**
- Make sure both servers are running (serve.ts + inngest-cli dev)
- Check the URL matches: `inngest-cli dev -u http://localhost:3000/api/inngest`

**Events not being processed?**
- Check the dashboard for event history
- Verify git hooks are executable and emitting events
- Check Inngest dev server logs for errors
