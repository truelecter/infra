import { useEffect, useState } from "react";
import { useRpc } from "@getpaseo/plugin/client";
import { type RewindMode, agentActionsRpc } from "../shared/agent-rpc";

export interface AgentActions {
  readonly rewindModes: readonly RewindMode[];
  readonly fork: boolean;
}

type ActionsCall = (input: { agentId: string }) => Promise<AgentActions>;

const NONE: AgentActions = { rewindModes: [], fork: false };

/**
 * One lookup per agent, shared by every card in its chat: a provider's rewind
 * support does not change while the agent lives. A failed lookup is not kept,
 * so the next card to mount asks again.
 */
const actionsByAgent = new Map<string, Promise<AgentActions>>();

/** The Rewind modes and Fork the agent offers; none until known. */
export function useAgentActions(agentId: string, enabled: boolean): AgentActions {
  const call: ActionsCall = useRpc(agentActionsRpc);
  const [actions, setActions] = useState<AgentActions>(NONE);

  useEffect(() => {
    if (!enabled) return;
    let lookup = actionsByAgent.get(agentId);
    if (!lookup) {
      lookup = call({ agentId });
      actionsByAgent.set(agentId, lookup);
      lookup.catch(() => actionsByAgent.delete(agentId));
    }
    let mounted = true;
    lookup
      .then((next) => {
        if (mounted) setActions(next);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [agentId, call, enabled]);

  return enabled ? actions : NONE;
}

export interface ForkTarget {
  agentId: string;
  /** The reply the fork's history ends at; the whole chat when absent. */
  boundaryMessageId?: string;
  /** Read by the card: agent state hooks only work inside workspace panels, not on the fork screen. */
  sourceTitle?: string | null;
}

/**
 * The reply a Fork press picked, for the fork screen to read. Timeline cards
 * cannot navigate, so a card stores its target here and opens the plugin's
 * fork screen, whose host props can open the new agent afterwards.
 */
let pendingFork: ForkTarget | null = null;
let openForkScreen: (() => void) | null = null;

/** Called once from the client entry with the host's `openSurface` for the fork screen. */
export function setForkScreenOpener(open: (() => void) | null): void {
  openForkScreen = open;
}

export function startFork(target: ForkTarget): void {
  pendingFork = target;
  openForkScreen?.();
}

export function takeForkTarget(): ForkTarget | null {
  const target = pendingFork;
  pendingFork = null;
  return target;
}
