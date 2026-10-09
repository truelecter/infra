import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import {
  BROWSER_COMMAND,
  BROWSER_COMMAND_DESCRIPTION,
  BROWSER_STATE_ENTRY,
  browserStateMessage,
  ENABLE_BROWSER_DESCRIPTION,
  ENABLED_PARAMETER_DESCRIPTION,
  ENABLE_BROWSER_TOOL,
  parseBrowserCommand,
  reconcileBrowserTools,
  restoreBrowserState,
} from "./shared/browser-tools.ts";
import { readPaseoEnv } from "./shared/env.ts";
import { runPaseoCli } from "./shared/paseo-cli.ts";
import {
  SET_TITLE_TOOL,
  setTitle,
  setTitleDescription,
  TITLE_PARAMETER_DESCRIPTION,
  toolsForAgent,
} from "./shared/set-title.ts";

export default function paseoTools(pi: ExtensionAPI): void {
  // Read once: Paseo fixes both for the life of the OMP process.
  const paseo = readPaseoEnv(process.env);
  if (!paseo) return;
  const z = pi.zod;

  pi.registerTool({
    name: SET_TITLE_TOOL,
    label: "Set title",
    description: setTitleDescription(paseo.agentId),
    parameters: z.object({ title: z.string().describe(TITLE_PARAMETER_DESCRIPTION) }),
    // Declared from the first request: adding a tool mid-session invalidates earlier thinking blocks.
    loadMode: "essential",
    approval: "write",
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const result = await setTitle(params.title, {
        agentId: paseo.agentId,
        agentKind: ctx.agent.kind,
        runCli: (args) => runPaseoCli(paseo.cli, args, signal),
        setSessionName: (title) => pi.setSessionName(title),
      });
      return { content: [{ type: "text", text: result.text }], isError: result.isError };
    },
  });

  // Browser tools: Paseo registers them as RPC host tools after session_start
  // (`set_host_tools`), and OMP activates new host tools on arrival without an
  // extension event. So the state is applied again before every user turn
  // (`input`) and every agent start (`before_agent_start`, never returning a
  // system prompt); both are no-ops once the active set matches.
  let browserEnabled = false;

  async function applyBrowserState(ctx: ExtensionContext): Promise<void> {
    if (ctx.agent.kind !== "main") return;
    const registered = pi.getAllTools().map((tool) => tool.name);
    const next = reconcileBrowserTools(pi.getActiveTools(), registered, browserEnabled);
    if (!next) return;
    if (!browserEnabled && next.includes(ENABLE_BROWSER_TOOL)) {
      // OMP announces xd:// unmounts as a notice and keeps the system prompt,
      // so the catalog would still list every browser_* device. A change of the
      // top-level tool set rebuilds the prompt; leaving out this extension's
      // own tool for one apply makes that change. OMP still skips the rebuild
      // (and sends the notice) mid-conversation when the model binds thinking
      // to the prompt prefix.
      await pi.setActiveTools(next.filter((name) => name !== ENABLE_BROWSER_TOOL));
    }
    await pi.setActiveTools(next);
  }

  async function setBrowserEnabled(enabled: boolean, ctx: ExtensionContext): Promise<string> {
    if (enabled !== browserEnabled) {
      browserEnabled = enabled;
      pi.appendEntry(BROWSER_STATE_ENTRY, { enabled });
    }
    await applyBrowserState(ctx);
    return browserStateMessage(browserEnabled, pi.getActiveTools());
  }

  async function restoreBrowser(_event: unknown, ctx: ExtensionContext): Promise<void> {
    browserEnabled = restoreBrowserState(ctx.sessionManager.getBranch());
    await applyBrowserState(ctx);
  }

  pi.registerTool({
    name: ENABLE_BROWSER_TOOL,
    label: "Paseo browser tools",
    description: ENABLE_BROWSER_DESCRIPTION,
    parameters: z.object({ enabled: z.boolean().describe(ENABLED_PARAMETER_DESCRIPTION) }),
    // Essential: a tool added mid-session would invalidate earlier thinking blocks.
    loadMode: "essential",
    approval: "read",
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (ctx.agent.kind !== "main") {
        return { content: [{ type: "text", text: "Subagents have no Paseo browser tools." }], isError: true };
      }
      return { content: [{ type: "text", text: await setBrowserEnabled(params.enabled === true, ctx) }] };
    },
  });

  pi.registerCommand(BROWSER_COMMAND, {
    description: BROWSER_COMMAND_DESCRIPTION,
    getArgumentCompletions: (prefix) =>
      ["on", "off"].filter((value) => value.startsWith(prefix.trim())).map((value) => ({ value, label: value })),
    async handler(args, ctx) {
      const parsed = parseBrowserCommand(args, browserEnabled);
      if (!parsed.ok) {
        ctx.ui.notify(parsed.error, "error");
        return;
      }
      ctx.ui.notify(await setBrowserEnabled(parsed.enabled, ctx), "info");
    },
  });

  // Subagent sessions run this factory too; they don't get the main-only tools.
  // session_start fires before their first request, so the tool list changes only once.
  pi.on("session_start", async (event, ctx) => {
    const tools = toolsForAgent(ctx.agent.kind, pi.getActiveTools(), [SET_TITLE_TOOL, ENABLE_BROWSER_TOOL]);
    if (tools) await pi.setActiveTools(tools);
    await restoreBrowser(event, ctx);
  });
  pi.on("session_switch", restoreBrowser);
  pi.on("session_branch", restoreBrowser);
  pi.on("session_tree", restoreBrowser);
  pi.on("input", (_event, ctx) => applyBrowserState(ctx));
  pi.on("before_agent_start", async (_event, ctx) => {
    await applyBrowserState(ctx);
  });
}
