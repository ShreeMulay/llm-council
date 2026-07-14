import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const mcpDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedPackageFiles = [
  "package/dist/generated/model-registry.json",
  "package/dist/index.d.ts",
  "package/dist/index.d.ts.map",
  "package/dist/index.js",
  "package/dist/index.js.map",
  "package/package.json",
];

function run(command, args, cwd, timeout = 60_000) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout,
    env: { ...process.env, NODE_PATH: undefined },
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result.stdout;
}

function sendMessage(child, message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function waitForResponse(child, id, timeout = 10_000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for JSON-RPC response ${id}`));
    }, timeout);
    const onData = (chunk) => {
      buffer += chunk.toString();
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) {
          const message = JSON.parse(line);
          if (message.id === id) {
            cleanup();
            resolve(message);
            return;
          }
        }
        newline = buffer.indexOf("\n");
      }
    };
    const onExit = (code, signal) => {
      cleanup();
      reject(new Error(`MCP process exited before response ${id}: code=${code} signal=${signal}`));
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
    };
    child.stdout.on("data", onData);
    child.on("exit", onExit);
  });
}

function stopProcess(child, timeout = 5_000) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("MCP process did not shut down after SIGTERM"));
    }, timeout);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      try {
        assert.ok(code === 0 || signal === "SIGTERM", `unclean MCP shutdown: code=${code} signal=${signal}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    child.kill("SIGTERM");
  });
}

function startBackendSentinel(timeout = 5_000) {
  return new Promise((resolve, reject) => {
    let connections = 0;
    let requests = 0;
    const server = createServer((_request, response) => {
      requests += 1;
      response.writeHead(500, { "content-type": "text/plain" });
      response.end("unexpected backend request");
    });
    server.on("connection", () => { connections += 1; });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error("Timed out starting backend sentinel"));
    }, timeout);
    server.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    server.listen(0, "127.0.0.1", () => {
      clearTimeout(timer);
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
        counts: () => ({ connections, requests }),
      });
    });
  });
}

function stopServer(server, timeout = 5_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.closeAllConnections();
      reject(new Error("Backend sentinel did not close"));
    }, timeout);
    server.close((error) => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    });
  });
}

test("packed MCP initializes in isolation with its canonical registry", { timeout: 120_000 }, async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "llm-council-mcp-package-"));
  let child;
  let sentinel;
  try {
    run("npm", ["run", "clean"], mcpDir);
    run("npx", ["--no-install", "tsc"], mcpDir);

    const dryRun = JSON.parse(run("npm", ["pack", "--dry-run", "--json"], mcpDir));
    assert.equal(dryRun.length, 1);
    assert.deepEqual(
      dryRun[0].files.map(({ path: filePath }) => `package/${filePath}`).sort(),
      expectedPackageFiles,
    );

    const canonicalRegistry = JSON.parse(
      await readFile(path.join(mcpDir, "src/generated/model-registry.json"), "utf8"),
    );
    const emittedRegistryPath = path.join(mcpDir, "dist/generated/model-registry.json");
    const emittedRegistry = JSON.parse(await readFile(emittedRegistryPath, "utf8"));
    assert.deepEqual(
      emittedRegistry,
      canonicalRegistry,
      "TypeScript-emitted registry differs from the canonical MCP projection",
    );
    assert.ok(emittedRegistry.default_roster.includes("openai/gpt-5.6-sol"));
    assert.ok(emittedRegistry.default_roster.includes("x-ai/grok-4.5"));

    const packOutput = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", workspace], mcpDir));
    const tarball = path.join(workspace, packOutput[0].filename);
    const projectDir = path.join(workspace, "consumer");
    const homeDir = path.join(workspace, "home");
    const runtimeDir = path.join(workspace, "runtime");
    await Promise.all([mkdir(projectDir), mkdir(homeDir), mkdir(runtimeDir)]);
    await writeFile(path.join(projectDir, "package.json"), '{"private":true,"type":"module"}\n');
    run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], projectDir);

    sentinel = await startBackendSentinel();
    const binPath = path.join(projectDir, "node_modules/.bin/llm-council-mcp");
    const runtimeEnv = {
      HOME: homeDir,
      XDG_RUNTIME_DIR: runtimeDir,
      LLM_COUNCIL_URL: sentinel.url,
      PATH: path.dirname(process.execPath),
    };
    child = spawn(binPath, [], {
      cwd: projectDir,
      env: runtimeEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    const initializeResponse = waitForResponse(child, 1);
    sendMessage(child, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "isolated-package-test", version: "1.0.0" },
      },
    });
    const initialized = await initializeResponse;
    assert.equal(initialized.result.serverInfo.name, "llm-council-server");

    sendMessage(child, { jsonrpc: "2.0", method: "notifications/initialized" });
    const toolsResponse = waitForResponse(child, 2);
    sendMessage(child, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const listed = await toolsResponse;
    const councilTool = listed.result.tools.find(({ name }) => name === "llm_council");
    assert.ok(councilTool, "llm_council tool was not listed");
    assert.deepEqual(Object.keys(councilTool.inputSchema.properties).sort(), [
      "chairman",
      "compact",
      "final_only",
      "include_details",
      "models",
      "parallel_classifier_score",
      "parallel_mode",
      "query",
      "tool_context",
    ]);
    assert.deepEqual(councilTool.inputSchema.required, ["query"]);
    assert.equal(councilTool.inputSchema.properties.query.type, "string");
    assert.deepEqual(councilTool.inputSchema.properties.parallel_mode.enum, ["disabled", "explicit", "classifier"]);
    assert.match(councilTool.description, /GPT-5\.6 Sol/);
    assert.match(councilTool.description, /Grok 4\.5/);
    assert.doesNotMatch(stderr, /\[Backend\]|fetch attempt|Starting streaming deliberation/);
    assert.deepEqual(
      sentinel.counts(),
      { connections: 0, requests: 0 },
      "initialize and tools/list must not contact the backend",
    );

    await stopProcess(child);
    child = undefined;
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    if (sentinel) await stopServer(sentinel.server);
    await rm(workspace, { recursive: true, force: true });
  }
});
