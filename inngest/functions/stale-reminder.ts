import { inngest } from "../client";

/**
 * Stale Issue Reminder
 * 
 * Runs every Monday at 10 AM.
 * Checks for issues that haven't been updated in 14+ days.
 * 
 * Good for catching forgotten work items.
 */
export const staleReminder = inngest.createFunction(
  { id: "stale-reminder" },
  { cron: "0 10 * * 1" },  // 10 AM Mondays
  async ({ step }) => {
    const staleIssues = await step.run("find-stale", async () => {
      try {
        const proc = Bun.spawn(["bd", "stale", "--days", "14", "--json"], {
          stdout: "pipe",
          stderr: "pipe"
        });
        const output = await new Response(proc.stdout).text();
        if (output.trim()) {
          return JSON.parse(output);
        }
        return [];
      } catch (e) {
        return [];
      }
    });

    if (staleIssues.length > 0) {
      console.log("=== Stale Issue Reminder ===");
      console.log(`⚠️ ${staleIssues.length} stale issues found!`);
      console.log("These issues haven't been updated in 14+ days:");
      
      for (const issue of staleIssues) {
        console.log(`  - ${issue.id}: ${issue.title}`);
      }
      
      console.log("\nConsider:");
      console.log("  1. Closing issues that are no longer relevant");
      console.log("  2. Updating issues with current status");
      console.log("  3. Breaking down large issues into smaller tasks");
    } else {
      console.log("No stale issues. Great job staying on top of things!");
    }

    return { 
      staleCount: staleIssues.length,
      issues: staleIssues 
    };
  }
);
