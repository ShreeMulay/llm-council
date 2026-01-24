#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BACKEND_URL = process.env.LLM_COUNCIL_URL || "http://localhost:8800";
const COUNCIL_TIMEOUT_MS = parseInt(process.env.LLM_COUNCIL_TIMEOUT || "180000", 10);

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
          text: `Error consulting LLM Council: ${errorMessage}\n\nMake sure the backend is running: cd llm-council && uv run python -m backend.main`,
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
