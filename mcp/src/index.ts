#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFileSync, spawn } from "child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync, openSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const modelRegistry = require("./generated/model-registry.json") as {
  default_roster: string[];
  compact_roster: string[];
  chairman: string;
  models: Array<{ id: string; label: string; aliases: string[] }>;
};
const labelFor = (id: string): string => modelRegistry.models.find((model) => model.id === id)?.label ?? id;
const defaultLabels = modelRegistry.default_roster.map(labelFor).join(", ");
const compactLabels = modelRegistry.compact_roster.map(labelFor).join(", ");
const aliases = modelRegistry.models.flatMap((model) => model.aliases);

const BACKEND_URL = process.env.LLM_COUNCIL_URL || "http://localhost:8800";
const HEALTH_URL = `${BACKEND_URL}/health`;
const BACKEND_CWD = path.join(__dirname, "../../");
const RUNTIME_DIR = (() => {
  const configured = process.env.XDG_RUNTIME_DIR;
  if (configured) return configured;
  const uid = typeof process.getuid === "function" ? process.getuid() : "nouid";
  return path.join(tmpdir(), `llm-council-${uid}`);
})();
mkdirSync(RUNTIME_DIR, { recursive: true, mode: 0o700 });
const PID_FILE = path.join(RUNTIME_DIR, "llm-council-backend.pid");
const BACKEND_LOG = path.join(RUNTIME_DIR, "llm-council.log");
const COUNCIL_API_KEY = process.env.COUNCIL_API_KEY || process.env.LLM_COUNCIL_KEY || "";
const IS_REMOTE = (() => {
  try {
    const url = new URL(BACKEND_URL);
    return !["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
})();

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

  /** Kill the process referenced by PID file, with validation to avoid killing unrelated processes */
  private killStalePid(): void {
    try {
      if (!existsSync(PID_FILE)) return;
      const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
      if (isNaN(pid) || pid <= 0) return;

      // Validate the PID belongs to a Python/backend process before killing
      try {
        let cmdline = "";
        try {
          cmdline = readFileSync(`/proc/${pid}/cmdline`, "utf-8").replace(/\0/g, " ");
        } catch {
          cmdline = execFileSync("ps", ["-p", String(pid), "-o", "args="], { encoding: "utf-8" });
        }
        if (!cmdline.includes("python") && !cmdline.includes("backend.main") && !cmdline.includes("uvicorn")) {
          console.error(`[Backend] PID ${pid} is not a backend process (${cmdline.trim().slice(0, 80)}), skipping kill`);
          this.cleanStalePidFile();
          return;
        }
      } catch {
        console.error(`[Backend] Could not verify PID ${pid} command, skipping kill`);
        this.cleanStalePidFile();
        return;
      }

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
    writeFileSync(PID_FILE, String(child.pid), { encoding: "utf-8", mode: 0o600 });
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
const COUNCIL_TIMEOUT_MS = parseInt(process.env.LLM_COUNCIL_TIMEOUT || "1500000", 10);

interface CouncilRequest {
  query: string;
  final_only?: boolean;
  compact?: boolean;
  include_details?: boolean;
  models?: string[];
  chairman?: string;
  tool_context?: boolean;
  parallel_mode?: "disabled" | "explicit" | "classifier";
  parallel_classifier_score?: number;
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
          `Consult ${modelRegistry.default_roster.length} LLMs (${defaultLabels}) for peer-reviewed answers. ` +
          `3-stage deliberation with ${labelFor(modelRegistry.chairman)} as chairman. ` +
          `Use for complex questions requiring multiple perspectives. Compact mode (${modelRegistry.compact_roster.length} models: ${compactLabels}) for faster results.`,
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
            compact: {
              type: "boolean",
              description:
                `Use only ${modelRegistry.compact_roster.length} core models (${compactLabels}) for faster/cheaper deliberation`,
              default: false,
            },
            include_details: {
              type: "boolean",
              description:
                "Include intermediate responses and evaluations in output",
              default: true,
            },
            models: {
              type: "array",
              items: { type: "string" },
              description:
                `Optional model aliases/IDs to use instead of the default council. Available aliases: ${aliases.join(", ")}`,
            },
            chairman: {
              type: "string",
              description: "Optional chairman model alias/ID for final synthesis",
            },
            tool_context: {
              type: "boolean",
              description:
                "Fetch and inject explicit URL context before deliberation (default true)",
              default: true,
            },
            parallel_mode: {
              type: "string",
              enum: ["disabled", "explicit", "classifier"],
              description: "Opt-in Parallel Stage 0 mode (default disabled)",
              default: "disabled",
            },
            parallel_classifier_score: {
              type: "number", minimum: 0, maximum: 1,
              description: "Caller-provided classifier score for classifier mode",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// ============================================================================
// SSE Stream Consumer — reads /api/council/stream, logs progress, returns result
// ============================================================================

interface SSEEvent {
  event?: string;
  stage?: number;
  model?: string;
  response?: string;
  provider?: string;
  progress?: string;
  count?: string;
  message?: string;
  markdown?: string;
  models?: string[];
  chairman?: string;
  parsed_ranking?: string[];
  tokens?: number;
  timing?: { elapsed_seconds: number };
  stage1?: unknown[];
  stage2?: unknown[];
  stage3?: unknown;
  metadata?: unknown;
  config?: unknown;
}

async function consumeSSEStream(
  response: Response,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body for SSE stream");

  const decoder = new TextDecoder();
  let buffer = "";
  let markdown = "";

  const processBlock = (block: string): void => {
    if (!block.trim()) return;
    const dataLines = block
      .replace(/\r\n/g, "\n")
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6));
    if (dataLines.length === 0) return;

    const evt: SSEEvent = JSON.parse(dataLines.join("\n"));

    switch (evt.event) {
      case "stage_start":
        if (evt.stage === 1) {
          console.error(`[Council] Stage 1: querying ${evt.models?.length ?? "?"} models...`);
        } else if (evt.stage === 2) {
          console.error(`[Council] Stage 2: peer rankings...`);
        } else if (evt.stage === 3) {
          console.error(`[Council] Stage 3: chairman ${evt.chairman ?? ""} synthesizing...`);
        }
        break;

      case "model_response":
        if (evt.stage === 1) {
          const preview = (evt.response ?? "").slice(0, 80);
          console.error(`[Council] ${evt.progress} ${evt.model} (${evt.provider}): ${preview}...`);
        } else if (evt.stage === 2) {
          console.error(`[Council] ${evt.progress} ${evt.model} ranked`);
        }
        break;

      case "model_failed":
        console.error(`[Council] ${evt.progress} ${evt.model} FAILED`);
        break;

      case "synthesis":
        console.error(`[Council] Chairman ${evt.model} responded (${(evt.response ?? "").length} chars)`);
        break;

      case "stage_complete":
        console.error(`[Council] Stage ${evt.stage} complete: ${evt.count}`);
        break;

      case "error":
        throw new Error(evt.message ?? "Unknown streaming error");

      case "complete":
        if (evt.markdown) {
          markdown = evt.markdown;
        }
        if (evt.timing) {
          console.error(`[Council] Done in ${evt.timing.elapsed_seconds}s`);
        }
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      if (buffer.trim()) {
        processBlock(buffer);
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");

    let eventEndIndex = buffer.indexOf("\n\n");
    while (eventEndIndex !== -1) {
      const block = buffer.slice(0, eventEndIndex);
      buffer = buffer.slice(eventEndIndex + 2);
      processBlock(block);
      eventEndIndex = buffer.indexOf("\n\n");
    }
  }

  return markdown;
}

// ============================================================================
// Tool Handler — uses streaming with retry logic and sync fallback
// ============================================================================

const MAX_FETCH_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

/** Warm the connection to remote backend (TLS handshake, DNS) before the real request */
async function warmConnection(): Promise<void> {
  if (!IS_REMOTE) return;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(tid);
  } catch {
    // Best effort — the real request will retry if this fails
  }
}

/** Fetch with retry for transient connection failures (DNS, TLS, TCP) */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number = MAX_FETCH_RETRIES,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Don't retry on abort (timeout) — that's intentional
      if (lastError.name === "AbortError") throw lastError;
      const cause = lastError.cause ? ` (cause: ${lastError.cause})` : "";
      console.error(
        `[Council] fetch attempt ${attempt}/${retries} failed: ${lastError.message}${cause}`
      );
      if (attempt < retries) {
        // Warm the connection before retrying
        await warmConnection();
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError!;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "llm_council") {
    throw new Error(`Unknown tool: ${name}`);
  }

  // Ensure backend is running (local mode only — remote Cloud Run is always up)
  if (!IS_REMOTE) {
    await backendManager.ensureRunning();
  } else {
    // Warm the TLS/TCP connection to Cloud Run before the real request
    await warmConnection();
  }

  const query = args?.query as string;
  const finalOnly = (args?.final_only as boolean) ?? false;
  const compact = (args?.compact as boolean) ?? false;
  const includeDetails = (args?.include_details as boolean) ?? true;
  const toolContext = (args?.tool_context as boolean) ?? true;
  const parallelMode = (args?.parallel_mode as CouncilRequest["parallel_mode"]) ?? "disabled";
  const parallelClassifierScore = args?.parallel_classifier_score as number | undefined;
  const models = args?.models as string[] | undefined;
  const chairman = args?.chairman as string | undefined;

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

  const requestBody: CouncilRequest = {
    query,
    final_only: finalOnly,
    compact,
    include_details: includeDetails,
    tool_context: toolContext,
    parallel_mode: parallelMode,
    parallel_classifier_score: parallelClassifierScore,
    models,
    chairman,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (COUNCIL_API_KEY) {
    headers["X-Council-Key"] = COUNCIL_API_KEY;
  }

  try {
    // Try streaming endpoint first (with retries for transient failures)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COUNCIL_TIMEOUT_MS);

    console.error(`[Council] Starting streaming deliberation (query: ${query.length} chars)...`);
    const streamResponse = await fetchWithRetry(
      `${BACKEND_URL}/api/council/stream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );

    // NOTE: timeout stays active until stream is fully consumed (not just headers)

    if (streamResponse.ok && streamResponse.headers.get("content-type")?.includes("text/event-stream")) {
      const markdown = await consumeSSEStream(streamResponse);
      clearTimeout(timeoutId);
      if (markdown) {
        return {
          content: [{ type: "text" as const, text: markdown }],
        };
      }
      // Empty markdown — fall through to sync
      console.error("[Council] Streaming returned empty result, falling back to sync");
    } else {
      clearTimeout(timeoutId);
      console.error(`[Council] Streaming unavailable (${streamResponse.status}), using sync`);
    }
  } catch (streamError) {
    const msg = streamError instanceof Error ? streamError.message : "unknown";
    const cause = streamError instanceof Error && streamError.cause
      ? ` | cause: ${streamError.cause}`
      : "";
    if (streamError instanceof Error && streamError.name === "AbortError") {
      return {
        content: [
          {
            type: "text" as const,
            text: `Council deliberation timed out after ${COUNCIL_TIMEOUT_MS / 1000}s. Try using final_only: true for faster results.`,
          },
        ],
        isError: true,
      };
    }
    console.error(`[Council] Streaming failed after ${MAX_FETCH_RETRIES} attempts (${msg}${cause}), falling back to sync`);
  }

  // Fallback: sync endpoint (also with retries)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COUNCIL_TIMEOUT_MS);

    console.error("[Council] Trying sync endpoint...");
    const response = await fetchWithRetry(
      `${BACKEND_URL}/api/council`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );

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
    const cause = error instanceof Error && error.cause
      ? ` (underlying: ${error.cause})`
      : "";
    
    if (error instanceof Error && error.name === "AbortError") {
      errorMessage = `Council deliberation timed out after ${COUNCIL_TIMEOUT_MS / 1000}s. Try using final_only: true for faster results.`;
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Error consulting LLM Council: ${errorMessage}${cause}`,
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
