import { inngest } from "../client";

/**
 * Quality Gates Function
 * 
 * Triggered on git.push events. Runs lint, test, and typecheck
 * for the project that was pushed.
 * 
 * Uses Inngest's step.run() for automatic retries on failure.
 */
export const qualityGates = inngest.createFunction(
  { 
    id: "quality-gates",
    retries: 2,
  },
  { event: "git.push" },
  async ({ event, step }) => {
    const { project, branch } = event.data;
    const projectPath = `/home/shreemulay/ai_projects/development/${project}`;
    
    // Detect project type
    const projectType = await step.run("detect-project-type", async () => {
      const fs = await import("fs");
      
      if (fs.existsSync(`${projectPath}/package.json`)) {
        return "typescript";
      } else if (fs.existsSync(`${projectPath}/pyproject.toml`)) {
        return "python";
      } else if (fs.existsSync(`${projectPath}/Cargo.toml`)) {
        return "rust";
      }
      return "unknown";
    });

    if (projectType === "unknown") {
      return { project, branch, status: "skipped", reason: "unknown project type" };
    }

    const results: Record<string, string> = {};

    if (projectType === "typescript") {
      // TypeScript/Bun project
      results.lint = await step.run("lint", async () => {
        const proc = Bun.spawn(["bun", "lint"], { 
          cwd: projectPath,
          stdout: "pipe",
          stderr: "pipe"
        });
        const output = await new Response(proc.stdout).text();
        const exitCode = await proc.exited;
        if (exitCode !== 0) throw new Error(`Lint failed: ${output}`);
        return "passed";
      });
      
      results.test = await step.run("test", async () => {
        const proc = Bun.spawn(["bun", "test"], { 
          cwd: projectPath,
          stdout: "pipe",
          stderr: "pipe"
        });
        const output = await new Response(proc.stdout).text();
        const exitCode = await proc.exited;
        if (exitCode !== 0) throw new Error(`Tests failed: ${output}`);
        return "passed";
      });
      
      results.typecheck = await step.run("typecheck", async () => {
        const proc = Bun.spawn(["bun", "tsc", "--noEmit"], { 
          cwd: projectPath,
          stdout: "pipe",
          stderr: "pipe"
        });
        const output = await new Response(proc.stdout).text();
        const exitCode = await proc.exited;
        if (exitCode !== 0) throw new Error(`Type check failed: ${output}`);
        return "passed";
      });
      
    } else if (projectType === "python") {
      // Python project
      results.lint = await step.run("lint", async () => {
        const proc = Bun.spawn(["ruff", "check", "."], { 
          cwd: projectPath,
          stdout: "pipe",
          stderr: "pipe"
        });
        const exitCode = await proc.exited;
        if (exitCode !== 0) throw new Error("Ruff lint failed");
        return "passed";
      });
      
      results.test = await step.run("test", async () => {
        const proc = Bun.spawn(["python", "-m", "pytest"], { 
          cwd: projectPath,
          stdout: "pipe",
          stderr: "pipe"
        });
        const exitCode = await proc.exited;
        if (exitCode !== 0) throw new Error("Pytest failed");
        return "passed";
      });
      
    } else if (projectType === "rust") {
      // Rust project
      results.check = await step.run("cargo-check", async () => {
        const proc = Bun.spawn(["cargo", "check"], { 
          cwd: projectPath,
          stdout: "pipe",
          stderr: "pipe"
        });
        const exitCode = await proc.exited;
        if (exitCode !== 0) throw new Error("Cargo check failed");
        return "passed";
      });
      
      results.test = await step.run("cargo-test", async () => {
        const proc = Bun.spawn(["cargo", "test"], { 
          cwd: projectPath,
          stdout: "pipe",
          stderr: "pipe"
        });
        const exitCode = await proc.exited;
        if (exitCode !== 0) throw new Error("Cargo test failed");
        return "passed";
      });
    }

    return { 
      project, 
      branch, 
      projectType,
      status: "passed",
      results
    };
  }
);
