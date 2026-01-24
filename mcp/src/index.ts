#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.LLM_COUNCIL_URL || "http://localhost:8800";
const HEALTH_URL = `${BACKEND_URL}/health`;
const BACKEND_CWD = path.join(__dirname, "../../");

// ============================================================================
// BackendManager - Auto-spawns Python backend if not running
// ============================================================================

class BackendManager {
  private process: ChildProcess | null = null;
  private isShuttingDown = false;

  async ensureRunning(): Promise<void> {
    if (this.isShuttingDown) return;
    if (await this.isAlive()) return;
    await this.spawn();
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

  private async spawn(): Promise<void> {
    if (this.process) {
      // Process exists but not responding - kill it first
      this.process.kill();
      this.process = null;
    }

    console.error("[Backend] Starting Python backend...");

    this.process = spawn("uv", ["run", "python", "-m", "backend.main"], {
      cwd: BACKEND_CWD,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        console.error(`[Backend] ${line}`);
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        console.error(`[Backend] ${line}`);
      }
    });

    this.process.on("exit", (code, signal) => {
      console.error(`[Backend] Process exited (code=${code}, signal=${signal})`);
      this.process = null;

      // Auto-restart if not shutting down
      if (!this.isShuttingDown) {
        console.error("[Backend] Will restart on next request");
      }
    });

    this.process.on("error", (err) => {
      console.error(`[Backend] Process error: ${err.message}`);
      this.process = null;
    });
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

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.process) {
      console.error("[Backend] Shutting down...");
      this.process.kill("SIGTERM");

      // Wait briefly for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (this.process) {
        this.process.kill("SIGKILL");
      }
      this.process = null;
    }
  }
}

const backendManager = new BackendManager();

// Shutdown handlers
process.on("SIGINT", async () => {
  await backendManager.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await backendManager.shutdown();
  process.exit(0);
});
const COUNCIL_TIMEOUT_MS = parseInt(process.env.LLM_COUNCIL_TIMEOUT || "600000", 10);

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
          "Consult multiple LLMs (Opus 4.5, Gemini Flash 3.0, Grok 4.1, GLM 4.7) for peer-reviewed answers. " +
          "3-stage deliberation: individual responses -> peer rankings -> chairman synthesis. " +
          "Use for complex questions requiring multiple perspectives or when high accuracy is critical.",
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

  // Ensure backend is running before processing request
  await backendManager.ensureRunning();

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

    const response = await fetch(`${BACKEND_URL}/api/council`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
