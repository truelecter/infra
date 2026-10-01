import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { lookup } from "@oh-my-pi/pi-coding-agent/config/registry";

import { withoutDenied } from "./shared/filter.ts";

// A `deny` in tools.approval blocks a call, but the tool stays in the model's list and the
// model may still try it. This takes denied tools out of the enabled list (top-level and
// xd:// mounts) so the model never sees them. MCP servers connect in the background and can
// mount their tools in the middle of the first turn, so this rechecks at every turn: OMP only
// tells the model about new mounts with its next request, and an unmount before then cancels
// the pending announcement.
export default function hideDeniedTools(pi: ExtensionAPI): void {
  const approval = lookup("tools.approval");

  async function sync(): Promise<void> {
    const policy = approval?.get(pi.pi.settings);
    if (!policy || typeof policy !== "object") return;
    const next = withoutDenied(pi.getActiveTools(), policy as Record<string, unknown>);
    if (next) await pi.setActiveTools(next);
  }

  pi.on("session_start", sync);
  pi.on("before_agent_start", sync);
  pi.on("turn_start", sync);
}
