/**
 * Offline showcase used only to capture README screenshots.
 *
 * It mounts the plugin's presentational components against mock data and the
 * same theme tokens the host feeds them, so a capture shows the real component
 * rather than a drawing of one.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { View } from "react-native";

import { embedFonts } from "../client/components/embed-fonts";
import { installFrostedGlass } from "../client/components/frosted";
import { buildThemeTokens } from "../client/components/theme-tokens";
import { ToolCallout } from "../client/components/tool-callouts";
import { ReasoningTrace } from "../client/components/reasoning-trace";
import { TaskList } from "../client/components/task-list";
import { ApprovalCard } from "../client/components/approval-card";
import { UserMessage } from "../client/components/user-message";
import { HubCallout } from "../client/components/hub-callout";
import { PaseoToolCallout } from "../client/components/paseo-tool-callouts";
import { SyntaxHighlightBlock } from "../client/components/syntax-highlight";
import { BeautifulChatSettingsPage } from "../client/settings-page";
import { buildHubData } from "../client/hub-details";
import { NoticeCallout } from "../client/components/notice-callout";
import { SystemCard } from "../client/components/system-card";
import { AssistantFooter } from "../client/components/turn-footer";
import { MarkdownView } from "../client/components/markdown/markdown-view";
import { parseSystemEnvelope } from "../client/system-envelope";
import { installPointerGlow } from "../client/components/glow";
import type { ToolCalloutData } from "../shared/contracts";

const DARK = {
  surface0: "#0f0f11",
  surface1: "#17171a",
  surface2: "#1f1f23",
  border: "#2a2a30",
  foreground: "#f2f3f5",
  foregroundMuted: "#a3a6ad",
  accent: "#7aa2f7",
  accentForeground: "#0f0f11",
  statusSuccess: "#4cb782",
  statusWarning: "#d9a53f",
  statusDanger: "#f2555a",
};

const PREFERENCES = {
  accent: "host" as const,
  uiFont: "inter" as const,
  codeFont: "code" as const,
  frostedGlass: true,
  enhancedUserBubble: true,
};

const tokens = buildThemeTokens(DARK, PREFERENCES);

const bash: ToolCalloutData = {
  id: "bash",
  tool: "bash",
  title: "npm run typecheck",
  status: "completed",
  durationMs: 4253,
  exitCode: 0,
  command: "npm run typecheck",
  shell: {
    command: "npm run typecheck",
    cwd: "~/code/beautiful-chat",
    exitCode: 0,
    stdout: "> beautiful-chat@0.1.0 typecheck\n> tsc --noEmit\n\nChecked 34 files in 4.2s",
  },
};

const git: ToolCalloutData = {
  id: "git",
  tool: "git",
  title: "Git commit",
  status: "completed",
  durationMs: 812,
  command: 'git commit -m "feat: reveal tool file paths"',
  shell: {
    command: 'git commit -m "feat: reveal tool file paths"',
    stdout: "[main 421f5e8] feat: reveal tool file paths\n 6 files changed, 155 insertions(+)",
  },
};

const read: ToolCalloutData = {
  id: "read",
  tool: "read",
  title: "Read theme-tokens.ts",
  status: "completed",
  durationMs: 41,
  filePath: "client/components/theme-tokens.ts",
  lineRange: "150-166",
  language: "typescript",
  code: `export function buildThemeTokens(
  colors: PluginSurfaceColors,
  preferences: EnhancerPreferences = DEFAULT_PREFERENCES,
): ExtendedThemeTokens {
  const isDark = isDarkSurface(colors.surface0);
  const accent = ACCENT_PRESETS[preferences.accent] ?? colors.accent;
  return { isDark, surface0: colors.surface0, accent };
}`,
};

const readImage: ToolCalloutData = {
  id: "read-image",
  tool: "read",
  title: "Read hero.png",
  status: "completed",
  durationMs: 28,
  filePath: "images/hero.png",
  code: "// [Image file: 1175x1150]",
};

/**
 * The bytes for the image card.
 *
 * In the app these arrive from the plugin's daemon-side RPC, which a capture
 * cannot reach. The capture script therefore sets `__bcImageUri` before the
 * bundle evaluates; without it the panel still renders, reporting that the
 * file could not be read, which is the honest offline state.
 */
const sampleImage = {
  dataUri: (globalThis as { __bcImageUri?: string }).__bcImageUri ?? null,
  width: 1175,
  height: 1150,
  bytes: 122632,
  error: "No daemon in the offline showcase",
};

const githubCalls: ToolCalloutData[] = [
  {
    id: "gh-file",
    tool: "github",
    title: "file_read omercnet/paseo-plugins paseo-shared-browser/paseo-plugin.json",
    status: "completed",
    durationMs: 412,
    github: {
      op: "file_read",
      repo: "omercnet/paseo-plugins",
      subject: "paseo-shared-browser/paseo-plugin.json",
      request:
        '{"op":"file_read","repo":"omercnet/paseo-plugins","path":"paseo-shared-browser/paseo-plugin.json"}',
      file: {
        name: "paseo-shared-browser/paseo-plugin.json",
        language: "json",
        code: `{
  "id": "shared-browser",
  "requirements": { "paseo": "^0.8.0" },
  "build": [
    ["npm", "ci", "--include=dev"],
    ["npm", "run", "prepare:runtime"]
  ]
}`,
      },
    },
  },
  {
    id: "gh-pr",
    tool: "github",
    title: "pr_create paseo-cafe/paseo-cafe Add beautiful-chat",
    status: "completed",
    durationMs: 2430,
    github: {
      op: "pr_create",
      repo: "paseo-cafe/paseo-cafe",
      subject: "Add beautiful-chat",
      request:
        '{"op":"pr_create","repo":"paseo-cafe/paseo-cafe","base":"main","head":"ABorakati:add-beautiful-chat","title":"Add beautiful-chat"}',
      rows: [
        { label: "pull request", value: "#125 Add beautiful-chat" },
        { label: "base", value: "main ← ABorakati:add-beautiful-chat" },
      ],
      link: "https://github.com/paseo-cafe/paseo-cafe/pull/125",
    },
  },
  {
    id: "gh-run",
    tool: "github",
    title: "run_watch paseo-cafe/paseo-cafe 34955871731",
    status: "completed",
    durationMs: 61200,
    github: {
      op: "run_watch",
      repo: "paseo-cafe/paseo-cafe",
      subject: "34955871731",
      request: '{"op":"run_watch","repo":"paseo-cafe/paseo-cafe","run":"34955871731"}',
      rows: [
        { label: "Registry admission", value: "pass 15s", tone: "ok" as const },
        { label: "App", value: "pass 36s", tone: "ok" as const },
        { label: "Plugin (matrix.os)", value: "skipping" },
        { label: "CodeRabbit", value: "pass", tone: "ok" as const },
      ],
    },
  },
  {
    id: "gh-search",
    tool: "github",
    title: "search_code omercnet/paseo-plugins defineRpc",
    status: "completed",
    durationMs: 986,
    github: {
      op: "search_code",
      repo: "omercnet/paseo-plugins",
      subject: "defineRpc",
      request: '{"op":"search_code","repo":"omercnet/paseo-plugins","query":"defineRpc"}',
      rows: [
        { label: "paseo-shared-browser/shared/rpc.ts", value: "2" },
        { label: "paseo-omp/shared/bridge.ts", value: "1" },
      ],
    },
  },
];

const edit: ToolCalloutData = {
  id: "edit",
  tool: "edit",
  title: "Edit user-message.tsx",
  status: "completed",
  durationMs: 66,
  filePath: "client/components/user-message.tsx",
  diff: `@@ -99,10 +99,12 @@ const styles = useMemo(
         container: {
           borderRadius: radius.card,
-          backgroundColor: "#E9EBEE",
-          borderColor: "rgba(0,0,0,0.12)",
+          borderTopRightRadius: radius.chip,
+          backgroundColor: tokens.userSurface,
+          borderColor: tokens.userBorder,
+          ...tokens.boxShadow,
         },
         body: { flex: 1, gap: 3 },`,
};

const thinking: ToolCalloutData = {
  id: "thinking",
  tool: "thinking",
  title: "Reasoning",
  status: "completed",
  durationMs: 2100,
  thinking: {
    text: "The host maps the stream item before any transformer runs, so pasted images never reach plugin code. A chip would have to guess, so the bubble becomes a setting instead.",
    status: "completed",
    tokenCount: 412,
    steps: [
      "Read the transform call site in the app bundle",
      "Confirm the daemon row stores the same item",
      "Offer the host bubble as a preference",
    ],
  },
};

const mcp: ToolCalloutData = {
  id: "mcp",
  tool: "mcp",
  title: "codedb_search",
  status: "completed",
  durationMs: 935,
  mcp: {
    server: "devnav",
    tool: "codedb_search",
    transport: "stdio",
    arguments: { project_root: "~/code/paseo", query: "buildThemeTokens" },
    result: "2 results\n  client/components/theme-tokens.ts:165\n  client/live-renderers.tsx:289",
  },
};

const evalCall: ToolCalloutData = {
  id: "eval",
  tool: "eval",
  title: "Eval kernel",
  status: "completed",
  durationMs: 180,
  cells: [
    {
      title: "resolve paths",
      language: "javascript",
      code: `const target = isAbsolute(clean) ? clean : resolve(cwd, clean);\nconsole.log(target);`,
      output: "C:\\Users\\dev\\code\\paseo\\package.json",
    },
  ],
};

const ask: ToolCalloutData = {
  id: "ask",
  tool: "ask",
  title: "User decision",
  status: "completed",
  askOptions: [
    {
      id: "keep",
      label: "Keep enhanced bubble",
      description: "Token usage and copy stay. Pasted images stay hidden.",
    },
    {
      id: "host",
      label: "Use the host bubble",
      description: "Paseo draws prompts, so image previews return.",
      recommended: true,
    },
  ],
  askAnswer: ["Use the host bubble"],
};

const task: ToolCalloutData = {
  id: "task",
  tool: "task",
  title: "3 subagents",
  status: "running",
  subagent: {
    context: "Goal: capture one screenshot per component against real mock data.",
    agents: [
      {
        name: "ShotBuilder",
        agentType: "task",
        task: "Build the offline showcase page and capture one screenshot per component.",
        status: "running",
      },
      {
        name: "MarkdownFixes",
        agentType: "task",
        task: "Size the ordered marker column from the whole marker, and measure table cells in the mono face.",
        status: "completed",
      },
      {
        name: "SurfaceMarkers",
        agentType: "sonic",
        task: "Add the selection surface spread to every card root.",
        status: "completed",
      },
    ],
  },
};

// Built by the plugin's own mapper from the arguments and output of real
// `hub` calls, so the capture proves the mapping rather than a mock.
const hubStart = buildHubData(
  {
    op: "start",
    name: "shots-server",
    application: "node",
    args: ["-e", "http.createServer(...)"],
    ready: { log: "shots ready", port: 4173 },
  },
  "Started shots-server: ready pid=33368 uptime=172ms restarts=0\nReady log matched: shots ready",
  {
    content: [{ type: "text", text: "Started shots-server: ready pid=33368" }],
    details: {
      op: "start",
      timedOut: false,
      daemon: {
        name: "shots-server",
        id: "d-1",
        state: "ready",
        pid: 33368,
        restartCount: 0,
        readyMatch: "shots ready",
        persist: false,
        detached: false,
      },
    },
  },
);

const hubPs = buildHubData({ op: "ps" }, undefined, {
  content: [{ type: "text", text: "- omp.lsp.mux: ready pid=72044 uptime=19h22m restarts=0" }],
  details: {
    op: "list",
    daemons: [
      { name: "omp.lsp.mux", state: "ready", pid: 72044, restartCount: 0 },
      { name: "omp.browser.headless", state: "ready", pid: 53972, restartCount: 0 },
      { name: "shots-server", state: "exited", pid: 33368, exitCode: 1, restartCount: 0 },
    ],
  },
});

const hubMessage = buildHubData(
  { op: "send", to: "ShotBuilder", message: "Capture the dark theme first. Light theme after." },
  "Delivered to 1 peer(s):\n- ShotBuilder: injected",
  {
    content: [{ type: "text", text: "Delivered to 1 peer(s):\n- ShotBuilder: injected" }],
    details: {
      op: "send",
      from: "Main",
      to: "ShotBuilder",
      receipts: [{ to: "ShotBuilder", outcome: "injected" }],
    },
  },
);

// The case that used to print the raw envelope: a job snapshot answers with an
// empty text block and puts everything in `details`.
const hubWait = buildHubData({ op: "wait" }, "", {
  content: [{ type: "text", text: "" }],
  details: {
    op: "wait",
    jobs: [
      {
        id: "NoticeCallout",
        type: "task",
        status: "running",
        label: "NoticeCallout",
        durationMs: 466244,
        resolvedModel: "anthropic/claude-opus-5:high",
      },
      {
        id: "bash_a1b2c3",
        type: "bash",
        status: "completed",
        label: "npm run typecheck",
        durationMs: 4253,
        resultText: "Checked 34 files in 4.2s",
      },
    ],
    agents: [
      { id: "ShotBuilder", parentId: "Main", activity: "capturing", ageMs: 92000, live: true },
    ],
  },
});

const hubPeers = buildHubData({ op: "list" }, undefined, {
  content: [
    { type: "text", text: "2 peer(s) (running 1, idle 1, parked 0; shown 2, truncated 0):" },
  ],
  details: {
    op: "list",
    from: "Main",
    peers: [
      {
        id: "ShotBuilder",
        displayName: "ShotBuilder",
        kind: "sub",
        status: "running",
        unread: 0,
        lastActivity: Date.now() - 12000,
        activity: "capturing the syntax block",
      },
      {
        id: "NoticeCallout",
        displayName: "NoticeCallout",
        kind: "sub",
        status: "idle",
        unread: 2,
        lastActivity: Date.now() - 65000,
      },
    ],
    counts: { running: 1, idle: 1, parked: 0, shown: 2, truncated: 0 },
  },
});

const paseoTool = {
  id: "paseo",
  tool: "create_agent" as const,
  durationMs: 640,
  createAgent: {
    title: "Screenshot builder",
    provider: "claude",
    model: "claude-opus-5",
    initialPrompt: "Capture every component of the Beautiful Chat plugin.",
    agentId: "agent-8f21",
    status: "running" as const,
  },
};

const reasoning = {
  id: "trace",
  agentModel: "claude-opus-5",
  durationMs: 8400,
  totalTokens: 1180,
  status: "completed" as const,
  steps: [
    {
      id: "s1",
      number: 1,
      title: "Locate the transform call site",
      summary: "The host maps stream items to plugin items before transformers run.",
      status: "completed" as const,
      durationMs: 2100,
      tokenCount: 320,
      content:
        "The app converts a stream item into the protocol item, and the user message mapping keeps only text.",
    },
    {
      id: "s2",
      number: 2,
      title: "Check the daemon row",
      summary: "AgentTimelineRow stores the same item, so a server RPC cannot recover images.",
      status: "completed" as const,
      durationMs: 1600,
      tokenCount: 260,
      content: "Attachments live in the client attachment store, which plugins cannot read.",
      codeSnippet: {
        language: "typescript" as const,
        filename: "agent-timeline-store-types.ts",
        code: "export interface AgentTimelineRow {\n  seq: number;\n  item: AgentTimelineItem;\n}",
      },
    },
    {
      id: "s3",
      number: 3,
      title: "Offer the host bubble",
      summary: "A preference trades the enhanced bubble for image previews.",
      status: "active" as const,
      content: "The transformer reads the preference and declines interception when it is off.",
    },
  ],
};

const tasks = {
  id: "tasks",
  phaseName: "Screenshots",
  tasks: [
    {
      id: "t1",
      title: "Rename plugin to Beautiful Chat",
      phase: "Rename",
      status: "completed" as const,
      duration: "6m",
    },
    {
      id: "t2",
      title: "Build the offline showcase page",
      phase: "Screenshots",
      status: "in_progress" as const,
    },
    {
      id: "t3",
      title: "Capture every component",
      phase: "Screenshots",
      status: "pending" as const,
    },
    {
      id: "t4",
      title: "Open the file editor from a path",
      phase: "Docs",
      status: "blocked" as const,
      blockerReason: "Paseo exposes no file navigation to plugins",
    },
  ],
};

const approval = {
  id: "approval",
  toolName: "bash",
  title: "Delete the build output",
  riskLevel: "high" as const,
  rationale: "The command removes a directory that is not tracked by Git.",
  command: "rm -rf dist",
  targetPath: "~/code/beautiful-chat/dist",
  cwd: "~/code/beautiful-chat",
  timeoutSeconds: 60,
  status: "pending" as const,
  timestamp: new Date("2026-09-14T10:24:29Z").toISOString(),
};

function Shot({
  id,
  width = 900,
  children,
}: {
  id: string;
  width?: number;
  children: React.ReactNode;
}) {
  return (
    <div id={id} style={{ width, padding: 20, backgroundColor: DARK.surface0 }}>
      <View style={{ gap: 10 }}>{children}</View>
    </div>
  );
}

/**
 * One conversation, in the order the timeline draws it: the prompt, the
 * model's thinking, its tool calls, the checklist, a background job landing,
 * and the reply that closes the turn. Every card here is the real component.
 */
const JOB_NOTICE = `<system-notice>
Background job MarkdownFixes has completed. Resume your work using the result below.
<task-result id="MarkdownFixes" agent="task" status="completed" duration="6m12s">
<meta lines="44" size="2.1KB" />
<preview full-output="agent://MarkdownFixes">
{
  "files": { "edited": "client/components/markdown/parse.ts" },
  "defects": ["ordered marker column sized from digits", "table cells under-measured"],
  "verification": [{ "check": "typecheck", "result": "pass" }]
}
</preview>
</task-result>
</system-notice>`;

const REPLY = [
  "## What shipped",
  "",
  "Links in a reply are clickable now, and they route through the host's own opener —",
  "see [pull/125](https://github.com/paseo-cafe/paseo-cafe/pull/125) or the bare form",
  "https://paseo.sh/docs.",
  "",
  "| Area | Result |",
  "| --- | --- |",
  "| Selection | Copy and Add to chat |",
  "| Highlighting | shiki on the daemon |",
  "| System text | drawn as cards |",
  "",
  "1. Parse the envelope, never guess.",
  "2. Draw the card from typed fields.",
  "   - job output on the code surface",
  "   - a relayed message as prose",
  "",
  "> A refused scheme stays inert: `javascript:` never reaches a sink.",
  "",
  "```ts",
  'const ALLOWED = new Set(["http:", "https:", "mailto:"]);',
  "if (!ALLOWED.has(new URL(url).protocol)) return;",
  "```",
].join("\n");

function Thread() {
  const envelope = parseSystemEnvelope(JOB_NOTICE);
  return (
    <View style={{ gap: 12 }}>
      <UserMessage
        text="I can't click on URLs in the assistant responses."
        timestamp={new Date("2026-09-15T22:41:00Z")}
        tokens={tokens}
      />
      <ReasoningTrace data={reasoning} tokens={tokens} defaultExpanded />
      <ToolCallout data={bash} tokens={tokens} />
      <ToolCallout data={read} tokens={tokens} onRevealPath={() => {}} />
      <ToolCallout data={edit} tokens={tokens} onRevealPath={() => {}} />
      <ToolCallout data={task} tokens={tokens} />
      <TaskList data={tasks} tokens={tokens} />
      <HubCallout data={hubWait} tokens={tokens} />
      {envelope ? <SystemCard envelope={envelope} tokens={tokens} /> : null}
      <NoticeCallout
        data={{ id: "n1", level: "warning", message: "The daemon restarted twice in 30s." }}
        tokens={tokens}
      />
      <ApprovalCard request={approval} tokens={tokens} />
      <View>
        <MarkdownView text={REPLY} tokens={tokens} variant="document" />
        <AssistantFooter text={REPLY} at={new Date("2026-09-15T22:47:12Z")} tokens={tokens} />
      </View>
    </View>
  );
}

const HERO_REPLY = [
  "## What shipped",
  "",
  "Links route through the host's own opener — [pull/125](https://github.com/paseo-cafe/paseo-cafe/pull/125)",
  "or the bare form https://paseo.sh/docs.",
  "",
  "| Area | Result |",
  "| --- | --- |",
  "| Selection | Copy and Add to chat |",
  "| Highlighting | shiki on the daemon |",
  "",
  "```ts",
  'const ALLOWED = new Set(["http:", "https:", "mailto:"]);',
  "```",
].join("\n");

/**
 * One screenful for the top of the README: a prompt, a tool call with a
 * highlighted file, a finished background job, and the reply that closes the
 * turn. Short enough to read at a glance, and every card is the real one.
 */
function Hero() {
  const envelope = parseSystemEnvelope(JOB_NOTICE);
  return (
    <View style={{ gap: 12 }}>
      <UserMessage
        text="I can't click on URLs in the assistant responses."
        timestamp={new Date("2026-09-15T22:41:00Z")}
        tokens={tokens}
      />
      <ToolCallout data={read} tokens={tokens} onRevealPath={() => {}} />
      {envelope ? <SystemCard envelope={envelope} tokens={tokens} /> : null}
      <View>
        <MarkdownView text={HERO_REPLY} tokens={tokens} variant="document" />
        <AssistantFooter text={HERO_REPLY} at={new Date("2026-09-15T22:47:12Z")} tokens={tokens} />
      </View>
    </View>
  );
}

function Showcase() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, backgroundColor: "#000" }}>
      <Shot id="shot-hero">
        <Hero />
      </Shot>
      <Shot id="shot-thread">
        <Thread />
      </Shot>
      <Shot id="shot-tool-bash">
        <ToolCallout data={bash} tokens={tokens} />
        <ToolCallout data={git} tokens={tokens} />
      </Shot>
      <Shot id="shot-tool-read">
        <ToolCallout data={read} tokens={tokens} onRevealPath={() => {}} />
      </Shot>
      <Shot id="shot-tool-image">
        <ToolCallout
          data={readImage}
          tokens={tokens}
          onRevealPath={() => {}}
          imageFile={sampleImage}
        />
      </Shot>
      <Shot id="shot-tool-github">
        {githubCalls.map((call) => (
          <ToolCallout key={call.id} data={call} tokens={tokens} />
        ))}
      </Shot>
      <Shot id="shot-tool-edit">
        <ToolCallout data={edit} tokens={tokens} onRevealPath={() => {}} />
      </Shot>
      <Shot id="shot-tool-thinking">
        <ToolCallout data={thinking} tokens={tokens} />
      </Shot>
      <Shot id="shot-tool-mcp">
        <ToolCallout data={mcp} tokens={tokens} />
      </Shot>
      <Shot id="shot-tool-eval">
        <ToolCallout data={evalCall} tokens={tokens} />
      </Shot>
      <Shot id="shot-tool-ask">
        <ToolCallout data={ask} tokens={tokens} />
      </Shot>
      <Shot id="shot-tool-task">
        <ToolCallout data={task} tokens={tokens} />
      </Shot>
      <Shot id="shot-hub">
        <HubCallout data={hubStart} tokens={tokens} />
        <HubCallout data={hubPs} tokens={tokens} />
        <HubCallout data={hubMessage} tokens={tokens} />
        <HubCallout data={hubWait} tokens={tokens} />
        <HubCallout data={hubPeers} tokens={tokens} />
      </Shot>
      <Shot id="shot-notice">
        <NoticeCallout
          data={{ id: "n1", level: "info", message: "Background task ShotBuilder completed." }}
          tokens={tokens}
        />
        <NoticeCallout
          data={{
            id: "n2",
            level: "info",
            message:
              "xd://: mounted mcp__better_icons_get_icon, mcp__better_icons_search_icons, mcp__devnav_codedb_search, mcp__devnav_codedb_symbol, mcp__devnav_webclaw_read, mcp__linkml_mcp_execute",
          }}
          tokens={tokens}
        />
        <NoticeCallout
          data={{ id: "n3", level: "warning", message: "The daemon restarted twice in 30s." }}
          tokens={tokens}
        />
        <NoticeCallout
          data={{ id: "n4", level: "error", message: "Provider quota exhausted.", fatal: true }}
          tokens={tokens}
        />
      </Shot>
      <Shot id="shot-paseo">
        <PaseoToolCallout data={paseoTool} tokens={tokens} />
      </Shot>
      <Shot id="shot-reasoning">
        <ReasoningTrace data={reasoning} tokens={tokens} defaultExpanded />
      </Shot>
      <Shot id="shot-tasks">
        <TaskList data={tasks} tokens={tokens} />
      </Shot>
      <Shot id="shot-approval">
        <ApprovalCard request={approval} tokens={tokens} />
      </Shot>
      <Shot id="shot-user">
        <UserMessage
          text="Open the file explorer from a tool call, and keep the prompt bubble on theme."
          timestamp={new Date("2026-09-14T10:24:29Z")}
          tokens={tokens}
        />
      </Shot>
      <Shot id="shot-syntax">
        <SyntaxHighlightBlock
          code={`export const revealPathRpc = defineRpc({\n  name: "file.reveal",\n  input: z.object({ cwd: z.string(), path: z.string() }),\n  output: z.object({ revealed: z.string().nullable(), error: z.string().nullable() }),\n});`}
          language="typescript"
          filename="shared/file-rpc.ts"
          tokens={tokens}
          showLineNumbers
          onRevealFile={() => {}}
        />
      </Shot>
      <Shot id="shot-settings" width={760}>
        <View style={{ height: 880 }}>
          <BeautifulChatSettingsPage
            theme={{ colors: DARK }}
            host={{ id: "local", label: "Local" }}
            layout={{ compact: false, platform: "web" }}
          />
        </View>
      </Shot>
    </div>
  );
}

embedFonts();
installFrostedGlass();
installPointerGlow();

console.log("showcase: bundle evaluated");
const mount = document.getElementById("root");
if (!mount) console.error("showcase: no root");
if (mount) {
  try {
    createRoot(mount).render(<Showcase />);
    console.log("showcase: render called");
  } catch (error) {
    console.error("showcase: render threw", error);
  }
}
