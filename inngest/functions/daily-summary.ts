import { inngest } from "../client";

/**
 * Daily Summary Function
 * 
 * Runs at 9 AM on weekdays (Monday-Friday).
 * Gathers status of all factory projects and available work.
 * 
 * Could be extended to send notifications to Google Chat, email, etc.
 */
export const dailySummary = inngest.createFunction(
  { id: "daily-summary" },
  { cron: "0 9 * * 1-5" },  // 9 AM weekdays (Mon-Fri)
  async ({ step }) => {
    const summary = await step.run("gather-status", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const devDir = "/home/shreemulay/ai_projects/development";
      const projects: Array<{
        name: string;
        hasBeads: boolean;
        hasOpenSpec: boolean;
      }> = [];
      
      // Scan development directory
      if (fs.existsSync(devDir)) {
        const entries = fs.readdirSync(devDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const projectPath = path.join(devDir, entry.name);
            projects.push({
              name: entry.name,
              hasBeads: fs.existsSync(path.join(projectPath, ".beads")),
              hasOpenSpec: fs.existsSync(path.join(projectPath, "openspec")),
            });
          }
        }
      }
      
      // Get ready tasks from Beads
      let readyTasks = 0;
      let staleTasks = 0;
      
      try {
        const readyProc = Bun.spawn(["bd", "ready", "--json"], {
          stdout: "pipe",
          stderr: "pipe"
        });
        const readyOutput = await new Response(readyProc.stdout).text();
        if (readyOutput.trim()) {
          const ready = JSON.parse(readyOutput);
          readyTasks = Array.isArray(ready) ? ready.length : 0;
        }
      } catch (e) {
        // Beads might not be available or no issues
      }
      
      try {
        const staleProc = Bun.spawn(["bd", "stale", "--days", "14", "--json"], {
          stdout: "pipe",
          stderr: "pipe"
        });
        const staleOutput = await new Response(staleProc.stdout).text();
        if (staleOutput.trim()) {
          const stale = JSON.parse(staleOutput);
          staleTasks = Array.isArray(stale) ? stale.length : 0;
        }
      } catch (e) {
        // Beads might not be available
      }
      
      return {
        timestamp: new Date().toISOString(),
        totalProjects: projects.length,
        factoryProjects: projects.filter(p => p.hasBeads || p.hasOpenSpec).length,
        readyTasks,
        staleTasks,
        projects: projects.filter(p => p.hasBeads || p.hasOpenSpec),
      };
    });

    // Log the summary (could send to Google Chat, email, etc.)
    console.log("=== Daily Factory Summary ===");
    console.log(`Date: ${summary.timestamp}`);
    console.log(`Factory Projects: ${summary.factoryProjects}`);
    console.log(`Ready Tasks: ${summary.readyTasks}`);
    console.log(`Stale Tasks (>14 days): ${summary.staleTasks}`);
    
    if (summary.staleTasks > 0) {
      console.log("⚠️ You have stale issues that need attention!");
    }
    
    return summary;
  }
);
