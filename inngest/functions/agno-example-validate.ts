import { inngest } from "../client";

/**
 * Agno Example Validation Function
 * 
 * Validates new/modified Agno Learning Hub examples.
 * Triggered when an example file is committed.
 * 
 * Checks:
 * 1. Import test - module imports without errors
 * 2. get_agent() exists and returns an Agent
 * 3. Smoke test - basic query works
 * 4. Required components (docstring, DEFAULT_CONFIG, etc.)
 */
export const agnoExampleValidate = inngest.createFunction(
  { 
    id: "agno-example-validate",
    retries: 1,
  },
  { event: "agno/example.updated" },
  async ({ event, step }) => {
    const { examplePath, exampleName, category } = event.data;
    const fullPath = `/home/shreemulay/ai_projects/development/agno-learning/examples/07_real_world/${examplePath}`;
    
    const results: Record<string, { passed: boolean; message: string }> = {};
    
    // Step 1: Check required files exist
    results.files = await step.run("check-files", async () => {
      const fs = await import("fs");
      
      const mainPy = `${fullPath}/main.py`;
      const readmeMd = `${fullPath}/README.md`;
      
      if (!fs.existsSync(mainPy)) {
        return { passed: false, message: "main.py not found" };
      }
      if (!fs.existsSync(readmeMd)) {
        return { passed: false, message: "README.md not found" };
      }
      
      return { passed: true, message: "All required files present" };
    });
    
    if (!results.files.passed) {
      return { exampleName, category, status: "failed", results };
    }
    
    // Step 2: Check main.py structure
    results.structure = await step.run("check-structure", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(`${fullPath}/main.py`, "utf-8");
      
      const checks = [
        { pattern: /^"""[\s\S]+?Example #\d+/, name: "docstring header" },
        { pattern: /DEFAULT_CONFIG\s*=\s*{/, name: "DEFAULT_CONFIG" },
        { pattern: /def get_agent\(/, name: "get_agent() function" },
        { pattern: /def main\(/, name: "main() function" },
        { pattern: /argparse\.ArgumentParser/, name: "argparse CLI" },
      ];
      
      const missing = checks.filter(c => !c.pattern.test(content)).map(c => c.name);
      
      if (missing.length > 0) {
        return { passed: false, message: `Missing: ${missing.join(", ")}` };
      }
      
      return { passed: true, message: "All required components present" };
    });
    
    if (!results.structure.passed) {
      return { exampleName, category, status: "failed", results };
    }
    
    // Step 3: Run import test
    results.import = await step.run("import-test", async () => {
      const proc = Bun.spawn([
        "python", "-c", 
        `import sys; sys.path.insert(0, '${fullPath}'); from main import get_agent, DEFAULT_CONFIG; print('OK')`
      ], {
        cwd: "/home/shreemulay/ai_projects/development/agno-learning",
        env: { ...process.env, PYTHONPATH: fullPath },
        stdout: "pipe",
        stderr: "pipe"
      });
      
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;
      
      if (exitCode !== 0) {
        return { passed: false, message: `Import failed: ${stderr.slice(0, 200)}` };
      }
      
      return { passed: true, message: "Import successful" };
    });
    
    if (!results.import.passed) {
      return { exampleName, category, status: "failed", results };
    }
    
    // Step 4: Run smoke test (with timeout)
    results.smoke = await step.run("smoke-test", async () => {
      const testScript = `
import sys
sys.path.insert(0, '${fullPath}')
from main import get_agent

agent = get_agent()
response = agent.run("Hello, this is a smoke test. Respond briefly.")
content = getattr(response, 'content', str(response))
if len(content) < 5:
    print("FAIL: Response too short")
    sys.exit(1)
print("OK")
`;
      
      const proc = Bun.spawn([
        "python", "-c", testScript
      ], {
        cwd: "/home/shreemulay/ai_projects/development/agno-learning",
        env: process.env,
        stdout: "pipe",
        stderr: "pipe"
      });
      
      // 30 second timeout
      const timeout = setTimeout(() => proc.kill(), 30000);
      
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;
      
      clearTimeout(timeout);
      
      if (exitCode !== 0) {
        return { passed: false, message: `Smoke test failed: ${stderr.slice(0, 200)}` };
      }
      
      return { passed: true, message: "Smoke test passed" };
    });
    
    const allPassed = Object.values(results).every(r => r.passed);
    
    return {
      exampleName,
      examplePath,
      category,
      status: allPassed ? "passed" : "failed",
      results
    };
  }
);

/**
 * Batch validation for all examples in a category
 */
export const agnoExampleValidateCategory = inngest.createFunction(
  {
    id: "agno-example-validate-category",
    retries: 0,
  },
  { event: "agno/category.validate" },
  async ({ event, step }) => {
    const { category } = event.data;
    const basePath = `/home/shreemulay/ai_projects/development/agno-learning/examples/07_real_world/${category}`;
    
    // Find all examples in category
    const examples = await step.run("find-examples", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const findMainPy = (dir: string): string[] => {
        const results: string[] = [];
        
        if (!fs.existsSync(dir)) return results;
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith(".")) {
            if (fs.existsSync(path.join(fullPath, "main.py"))) {
              results.push(fullPath);
            }
            results.push(...findMainPy(fullPath));
          }
        }
        return results;
      };
      
      return findMainPy(basePath);
    });
    
    // Validate each example (fan-out)
    const validations = await Promise.all(
      examples.map(examplePath => 
        step.run(`validate-${examplePath.split("/").pop()}`, async () => {
          const proc = Bun.spawn([
            "python", "-c",
            `
import sys
sys.path.insert(0, '${examplePath}')
try:
    from main import get_agent, DEFAULT_CONFIG
    agent = get_agent()
    print("OK")
except Exception as e:
    print(f"FAIL: {e}")
    sys.exit(1)
`
          ], {
            cwd: "/home/shreemulay/ai_projects/development/agno-learning",
            stdout: "pipe",
            stderr: "pipe"
          });
          
          const exitCode = await proc.exited;
          return {
            path: examplePath,
            passed: exitCode === 0
          };
        })
      )
    );
    
    const passed = validations.filter(v => v.passed).length;
    const failed = validations.filter(v => !v.passed).length;
    
    return {
      category,
      total: examples.length,
      passed,
      failed,
      failedExamples: validations.filter(v => !v.passed).map(v => v.path)
    };
  }
);
