import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import type { RewindMode } from "../shared/agent-rpc";

// Paseo's plugin compiler resolves type imports too, and only the plugin SDK is
// resolvable from an installed plugin, so the SDK client's types come through it.
type PaseoApi = PluginHandlerContext["paseo"];
// The create options name the attachment shape that `forkContext()` returns.
type CreateAgentOptions = PaseoApi["agents"] extends { create(options: infer Options): unknown }
  ? Options
  : never;
type AgentAttachment = NonNullable<CreateAgentOptions["attachments"]>[number];

/**
 * `rewind()` and `forkContext()` on the SDK agent handle, from Paseo builds that
 * carry the agent SDK patches. The plugin's pinned SDK types predate them, so a
 * handle is read through this view: either method is undefined on a host
 * without it, and that host offers neither action.
 */
interface PatchedHandle {
  rewind?(messageId: string, mode: RewindMode): Promise<void>;
  forkContext?(options?: { boundaryMessageId?: string }): Promise<{ attachment: AgentAttachment | null }>;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function agentActions(
  paseo: PaseoApi,
  agentId: string,
): Promise<{ rewindModes: RewindMode[]; fork: boolean }> {
  const handle = paseo.agents.ref(agentId);
  const patched = handle as unknown as PatchedHandle;
  if (!patched.rewind && !patched.forkContext) return { rewindModes: [], fork: false };
  await handle.refresh();
  const capabilities = handle.capabilities;
  const rewindModes: RewindMode[] = [];
  if (patched.rewind && capabilities) {
    if (capabilities.supportsRewindConversation) rewindModes.push("conversation");
    if (capabilities.supportsRewindFiles) rewindModes.push("files");
    if (capabilities.supportsRewindBoth) rewindModes.push("both");
  }
  return { rewindModes, fork: patched.forkContext !== undefined && handle.current() !== null };
}

export async function rewindAgent(
  paseo: PaseoApi,
  input: { agentId: string; messageId: string; mode: RewindMode },
): Promise<string | null> {
  const patched = paseo.agents.ref(input.agentId) as unknown as PatchedHandle;
  if (!patched.rewind) return "This Paseo build has no agent rewind in its SDK.";
  try {
    await patched.rewind(input.messageId, input.mode);
    return null;
  } catch (error) {
    return errorText(error);
  }
}

/**
 * Paseo's own Fork (`hooks/use-fork-agent.ts`) opens a draft with the chat
 * history attached and the source's provider settings. Plugins cannot open a
 * draft, so the prompt comes from the plugin's fork screen and the agent is
 * created here with the same settings and attachment.
 */
export async function forkAgent(
  paseo: PaseoApi,
  input: { agentId: string; boundaryMessageId?: string; prompt: string },
): Promise<{ agentId: string | null; error: string | null }> {
  const source = paseo.agents.ref(input.agentId);
  const patched = source as unknown as PatchedHandle;
  if (!patched.forkContext) {
    return { agentId: null, error: "This Paseo build has no agent fork context in its SDK." };
  }
  try {
    await source.refresh();
    const agent = source.current();
    if (!agent) return { agentId: null, error: "The source agent is gone." };
    const context = await patched.forkContext(
      input.boundaryMessageId ? { boundaryMessageId: input.boundaryMessageId } : undefined,
    );
    if (!context.attachment) return { agentId: null, error: "Paseo returned no chat history to fork." };

    const model = agent.model ?? agent.runtimeInfo?.model ?? null;
    const modeId = agent.currentModeId ?? agent.runtimeInfo?.modeId ?? null;
    const thinkingOptionId = agent.thinkingOptionId ?? agent.runtimeInfo?.thinkingOptionId ?? null;
    const featureValues: Record<string, unknown> = {};
    for (const feature of agent.features ?? []) featureValues[feature.id] = feature.value;
    const options = {
      config: {
        provider: model ? `${agent.provider}/${model}` : agent.provider,
        ...(modeId ? { modeId } : {}),
        ...(thinkingOptionId ? { thinkingOptionId } : {}),
        ...(Object.keys(featureValues).length > 0 ? { featureValues } : {}),
      },
      prompt: input.prompt,
      attachments: [context.attachment],
    };
    const created = agent.workspaceId
      ? await paseo.workspaces.ref(agent.workspaceId).agents.create(options)
      : await paseo.agents.create({ ...options, cwd: agent.cwd });
    return { agentId: created.id, error: null };
  } catch (error) {
    return { agentId: null, error: errorText(error) };
  }
}
