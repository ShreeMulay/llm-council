#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync, openSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.LLM_COUNCIL_URL || "http://localhost:8800";
const HEALTH_URL = `${BACKEND_URL}/health`;
const BACKEND_CWD = path.join(__dirname, "../../");
const PID_FILE = "/tmp/llm-council-backend.pid";
const BACKEND_LOG = "/tmp/llm-council.log";
const COUNCIL_API_KEY = process.env.LLM_COUNCIL_KEY || "";
const IS_REMOTE = BACKEND_URL.startsWith("https://");

// ============================================================================
// BackendManager - Auto-spawns Python backend if not running
//
// Design: Backend runs DETACHED so it survives MCP server restarts.
// Multiple MCP servers coordinate via PID file. Only spawns if no
// healthy backend exists. Never kills backend on MCP shutdown —
// backend persists across sessions.
// ============================================================================

class BackendManager {
  private spawnedByUs = false;

  async ensureRunning(): Promise<void> {
    // Fast path: backend is already responding
    if (await this.isAlive()) return;

    // Check PID file — maybe backend is starting up
    if (this.isPidAlive()) {
      console.error("[Backend] PID file exists, process alive — waiting for ready...");
      try {
        await this.waitForReady(15000);
        return;
      } catch {
        console.error("[Backend] PID process alive but not responding — killing stale process");
        this.killStalePid();
      }
    } else {
      // PID file missing or stale — clean up
      this.cleanStalePidFile();
    }

    // No healthy backend — spawn one
    await this.spawnDetached();
    await this.waitForReady();
  }

  private async isAlive(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(HEALTH_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Read PID from file and check if that process is actually running */
  private isPidAlive(): boolean {
    try {
      if (!existsSync(PID_FILE)) return false;
      const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
      if (isNaN(pid) || pid <= 0) return false;
      // signal 0 = check if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /** Kill the process referenced by PID file */
  private killStalePid(): void {
    try {
      if (!existsSync(PID_FILE)) return;
      const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
      if (isNaN(pid) || pid <= 0) return;
      process.kill(pid, "SIGTERM");
      console.error(`[Backend] Sent SIGTERM to stale PID ${pid}`);
    } catch {
      // Process already dead
    }
    this.cleanStalePidFile();
  }

  /** Remove PID file if it exists */
  private cleanStalePidFile(): void {
    try {
      if (existsSync(PID_FILE)) {
        unlinkSync(PID_FILE);
        console.error("[Backend] Cleaned stale PID file");
      }
    } catch {
      // Ignore
    }
  }

  private async spawnDetached(): Promise<void> {
    console.error("[Backend] Starting Python backend (detached)...");

    // Open log file for stdout/stderr redirect (detached processes can't pipe to parent)
    const logFd = openSync(BACKEND_LOG, "a");

    const child = spawn("uv", ["run", "python", "-m", "backend.main"], {
      cwd: BACKEND_CWD,
      detached: true,
      stdio: ["ignore", logFd, logFd],
    });

    if (!child.pid) {
      throw new Error("Failed to spawn backend process — no PID returned");
    }

    // Write PID file for coordination with other MCP server instances
    writeFileSync(PID_FILE, String(child.pid), "utf-8");
    console.error(`[Backend] Spawned PID ${child.pid}, wrote ${PID_FILE}`);

    // Unref so this MCP server can exit without killing the backend
    child.unref();
    this.spawnedByUs = true;
  }

  private async waitForReady(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < timeout) {
      if (await this.isAlive()) {
        console.error("[Backend] Ready and accepting connections");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Backend failed to start within ${timeout / 1000}s`);
  }

  /**
   * Shutdown: Do NOT kill the backend — it's shared across sessions.
   * The backend persists independently. Only clean up if we need to
   * force-restart (handled by ensureRunning's stale PID logic).
   */
  async shutdown(): Promise<void> {
    console.error("[Backend] MCP server shutting down — backend left running for other sessions");
    // Intentionally do NOT kill the backend process.
    // It's detached and shared across MCP server instances.
  }
}

const backendManager = new BackendManager();

// Shutdown handlers — graceful exit without killing backend
process.on("SIGINT", async () => {
  await backendManager.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await backendManager.shutdown();
  process.exit(0);
});
const COUNCIL_TIMEOUT_MS = parseInt(process.env.LLM_COUNCIL_TIMEOUT || "900000", 10);

interface CouncilRequest {
  query: string;
  final_only?: boolean;
  include_details?: boolean;
  models?: string[];
  chairman?: string;
}

interface CouncilResponse {
  markdown: string;
  stage1: unknown[];
  stage2: unknown[];
  stage3: unknown;
  metadata: unknown;
  timing: { elapsed_seconds: number };
  config: unknown;
}

const server = new Server(
  {
    name: "llm-council-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "llm_council",
        description:
          "Consult 5 LLMs (GPT-5.2, Opus 4.6, GLM-5, Gemini 3.1 Pro, Grok 4.1) for peer-reviewed answers. " +
          "3-stage deliberation: individual responses -> peer rankings -> chairman synthesis (Opus 4.6). " +
          "GLM-5 via Fireworks (3.4x faster). Use for complex questions requiring multiple perspectives.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description: "The question or task to ask the council",
            },
            final_only: {
              type: "boolean",
              description:
                "Skip peer review, return only individual + synthesized answer (faster, cheaper)",
              default: false,
            },
            include_details: {
              type: "boolean",
              description:
                "Include intermediate responses and evaluations in output",
              default: true,
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "llm_council") {
    throw new Error(`Unknown tool: ${name}`);
  }

  // Ensure backend is running (local mode only — remote Cloud Run is always up)
  if (!IS_REMOTE) {
    await backendManager.ensureRunning();
  }

  const query = args?.query as string;
  const finalOnly = (args?.final_only as boolean) ?? false;
  const includeDetails = (args?.include_details as boolean) ?? true;

  if (!query) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Error: query is required",
        },
      ],
      isError: true,
    };
  }

  try {
    const requestBody: CouncilRequest = {
      query,
      final_only: finalOnly,
      include_details: includeDetails,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COUNCIL_TIMEOUT_MS);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (COUNCIL_API_KEY) {
      headers["X-Council-Key"] = COUNCIL_API_KEY;
    }

    const response = await fetch(`${BACKEND_URL}/api/council`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as CouncilResponse;

    return {
      content: [
        {
          type: "text" as const,
          text: result.markdown,
        },
      ],
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (error instanceof Error && error.name === "AbortError") {
      errorMessage = `Council deliberation timed out after ${COUNCIL_TIMEOUT_MS / 1000}s. Try using final_only: true for faster results.`;
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Error consulting LLM Council: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LLM Council MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
