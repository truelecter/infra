import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { buildPrompt } from "./shared/prompt.ts";

export default function paseoAgentId(pi: ExtensionAPI): void {
  // Read once: the id is fixed for the life of the OMP process.
  const section = buildPrompt(process.env.PASEO_AGENT_ID);
  if (!section) return;

  pi.on("before_agent_start", async (event) => {
    return { systemPrompt: [...event.systemPrompt, section] };
  });
}
