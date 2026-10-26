// paseo-pin-workspace <workspace-id> [--unpin]
//
// Pins a workspace to the top of the local Paseo daemon's sidebar, or unpins it, and prints
// {"workspaceId":"...","pinnedAt":"<iso>"|null}. Paseo's CLI and MCP tools have no pin command; the
// daemon takes it over its WebSocket (`workspace.pin.set.request`), which the internal client of
// `@getpaseo/client` sends. That client is pinned with the plugins' end-to-end suite.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import { WebSocket } from "ws";

const usage = "usage: paseo-pin-workspace <workspace-id> [--unpin]";

function fail(message) {
  process.stderr.write(`paseo-pin-workspace: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  let pinned = true;
  const ids = [];
  for (const arg of argv) {
    if (arg === "--unpin") pinned = false;
    else if (arg === "-h" || arg === "--help") {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    } else if (arg.startsWith("-")) fail(`unknown option ${arg}\n${usage}`);
    else ids.push(arg);
  }
  if (ids.length !== 1) fail(usage);
  return { workspaceId: ids[0], pinned };
}

function readText(file, what) {
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    fail(`can't read ${what} ${file}: ${error.code ?? error.message}`);
  }
}

// The address the running daemon listens on, from the pid file it writes at start.
function daemonUrl(home) {
  const pidFile = path.join(home, "paseo.pid");
  let listen;
  try {
    listen = JSON.parse(readText(pidFile, "the daemon pid file (is the Paseo daemon running?)")).listen;
  } catch {
    fail(`${pidFile} is not valid JSON`);
  }
  if (typeof listen !== "string" || listen === "") fail(`${pidFile} has no "listen" address`);
  if (listen.startsWith("/") || listen.startsWith("unix://")) {
    fail(`the daemon listens on a socket (${listen}); only TCP addresses are supported`);
  }
  return `ws://${listen}/ws`;
}

const silent = { debug() {}, info() {}, warn() {}, error() {} };

const { workspaceId, pinned } = parseArgs(process.argv.slice(2));
const home = process.env.PASEO_HOME || path.join(os.homedir(), ".paseo");
const url = daemonUrl(home);
const token = readText(path.join(home, "local-credential"), "the local credential").trim();
if (token === "") fail(`${path.join(home, "local-credential")} is empty`);

const client = new DaemonClient({
  url,
  clientId: `paseo-pin-workspace-${randomUUID()}`,
  clientType: "cli",
  localCredential: () => token,
  webSocketFactory: (wsUrl, options) => new WebSocket(wsUrl, { headers: options?.headers }),
  logger: silent,
  connectTimeoutMs: 5000,
  reconnect: { enabled: false },
});

let result;
let failure;
try {
  await client.connect();
} catch (error) {
  failure = `can't connect to the Paseo daemon at ${url}: ${error.message}`;
}
if (!failure) {
  try {
    result = await client.setWorkspacePinned(workspaceId, pinned);
  } catch (error) {
    failure = `the daemon rejected ${pinned ? "pinning" : "unpinning"} ${workspaceId}: ${error.message}`;
  }
}
await client.close().catch(() => {});
if (failure) fail(failure);
process.stdout.write(`${JSON.stringify({ workspaceId, pinnedAt: result.pinnedAt ?? null })}\n`);
process.exit(0);
