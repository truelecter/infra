import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { getAgentDir } from "@oh-my-pi/pi-utils";

import { enabledServers, missingServers } from "./shared/servers.ts";

// With a UI (interactive, and the rpc-ui mode Paseo uses) OMP connects MCP servers in the
// background and doesn't wait for them before the first prompt. A server that takes a few
// seconds to start then mounts its tools mid-turn, and the model only hears about them
// from the next prompt on. This holds the first prompt until every configured server has
// tools, or until the timeout.
const TIMEOUT_MS = Number(process.env.OMP_MCP_READY_TIMEOUT_MS ?? 20_000);
const POLL_MS = 200;

function readServers(path: string): string[] {
  try {
    return enabledServers(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return [];
  }
}

export default function mcpReady(pi: ExtensionAPI): void {
  let ready: Promise<void> | null = null;

  async function waitForServers(cwd: string): Promise<void> {
    // The same user and project files OMP reads: mcp.json and .mcp.json in each.
    const dirs = [getAgentDir(), join(cwd, ".omp")];
    const servers = [
      ...new Set(
        dirs.flatMap((dir) => [
          ...readServers(join(dir, "mcp.json")),
          ...readServers(join(dir, ".mcp.json")),
        ]),
      ),
    ];
    const deadline = Date.now() + TIMEOUT_MS;
    let missing = missingServers(servers, pi.getActiveTools());
    while (missing.length > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      missing = missingServers(servers, pi.getActiveTools());
    }
    if (missing.length > 0) {
      console.error(
        `[mcp-ready] no tools from ${missing.join(", ")} after ${TIMEOUT_MS} ms; continuing without`,
      );
    }
  }

  pi.on("before_agent_start", async (_event, ctx) => {
    ready ??= waitForServers(ctx.cwd);
    await ready;
  });
}
