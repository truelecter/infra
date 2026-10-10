import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
// The package root exports the high-level SDK; Paseo's suite drives the raw client.
import { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import { WebSocket } from "ws";
import { env } from "./env";

// Out-of-band access to the isolated daemon, as Paseo's own e2e suite does it
// (packages/app/e2e/support/helpers/seed-client.ts): a DaemonClient over the daemon's WebSocket.

export type Client = DaemonClient;

export async function connectClient(): Promise<Client> {
  const client = new DaemonClient({
    url: `ws://127.0.0.1:${env.port}/ws`,
    clientId: `plugins-e2e-${randomUUID()}`,
    clientType: "cli",
    webSocketFactory: (
      url: string,
      options?: { headers?: Record<string, string> },
    ) => new WebSocket(url, { headers: options?.headers }) as never,
  });
  await client.connect();
  return client;
}

/** A git repository under the temp root, opened as a project with one workspace. */
export interface SeededWorkspace {
  client: Client;
  repoPath: string;
  workspaceId: string;
  projectId: string;
  /** Paseo's sidebar key for the project (`sidebar-project-row-<key>`). */
  projectKey: string;
}

export async function seedWorkspace(
  client: Client,
  name: string,
): Promise<SeededWorkspace> {
  const repoPath = path.join(
    env.root,
    "projects",
    `${name}-${randomUUID().slice(0, 8)}`,
  );
  mkdirSync(repoPath, { recursive: true });
  writeFileSync(path.join(repoPath, "README.md"), `# ${name}\n`);
  // The runner's own git config (hooks, signing, templates) stays out of the fixture repository.
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      ["-c", "user.name=e2e", "-c", "user.email=e2e@example.invalid", ...args],
      {
        cwd: repoPath,
        stdio: "ignore",
        env: {
          ...process.env,
          HOME: env.fakeHome,
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: "/dev/null",
        },
      },
    );
  git("init", "-q", "-b", "main");
  git("add", ".");
  git("commit", "-q", "-m", "init");

  const created = await client.createWorkspace({
    source: { kind: "directory", path: repoPath },
  });
  if (!created.workspace)
    throw new Error(
      created.error ?? `could not create a workspace for ${repoPath}`,
    );
  const { workspace } = created;
  const projects = await client.listProjects();
  const project = projects.projects.find(
    (entry) => entry.projectId === workspace.projectId,
  );
  if (!project?.projectKey)
    throw new Error(`project ${workspace.projectId} has no project key`);
  return {
    client,
    repoPath,
    workspaceId: workspace.id,
    projectId: workspace.projectId,
    projectKey: project.projectKey,
  };
}

/**
 * A mock-provider agent (development mode only). Its `load-test` turns stream reasoning and text;
 * `e2e-fast-stream` ends a turn after about 2 s, before any tool call, and `ten-second-stream`
 * runs about 10 s with read, grep, edit, and bash tool calls.
 */
export async function createMockAgent(
  workspace: SeededWorkspace,
  options: {
    title: string;
    initialPrompt?: string;
    model?: "e2e-fast-stream" | "ten-second-stream";
  },
): Promise<string> {
  const agent = await workspace.client.createAgent({
    provider: "mock",
    cwd: workspace.repoPath,
    workspaceId: workspace.workspaceId,
    title: options.title,
    modeId: "load-test",
    model: options.model ?? "e2e-fast-stream",
    initialPrompt: options.initialPrompt,
  });
  return agent.id;
}

/** Waits until the agent's current turn is over (`waitForFinish` resolves on idle). */
export async function finishTurn(
  client: Client,
  agentId: string,
): Promise<void> {
  const result = await client.waitForFinish(agentId, 60_000);
  if (result.status !== "idle")
    throw new Error(`agent ${agentId} ended its turn as ${result.status}`);
}

// encodeWorkspaceIdForPathSegment in Paseo's packages/app/src/utils/host-routes.ts.
function workspaceSegment(workspaceId: string): string {
  if (/^[A-Za-z0-9._~-]+$/.test(workspaceId)) return workspaceId;
  return `b64_${Buffer.from(workspaceId, "utf8").toString("base64url")}`;
}

export function workspaceRoute(workspaceId: string): string {
  return `/h/${encodeURIComponent(env.serverId)}/workspace/${encodeURIComponent(workspaceSegment(workspaceId))}`;
}

/** The app route that opens an agent's tab in its workspace. */
export function agentRoute(workspaceId: string, agentId: string): string {
  return `${workspaceRoute(workspaceId)}?open=${encodeURIComponent(`agent:${agentId}`)}`;
}
