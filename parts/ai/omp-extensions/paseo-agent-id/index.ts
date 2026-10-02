import type { AgentMessage, ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { buildPrompt, needsSection, SECTION_MESSAGE_TYPE } from "./shared/prompt.ts";

export default function paseoAgentId(pi: ExtensionAPI): void {
  // Read once: the id is fixed for the life of the OMP process.
  const section = buildPrompt(process.env.PASEO_AGENT_ID);
  if (!section) return;

  pi.on("before_agent_start", async (event) => {
    return { systemPrompt: [...event.systemPrompt, section] };
  });

  // Turns an extension starts skip before_agent_start; give those requests the
  // section as a hidden message in front, where it keeps the cached prefix stable.
  // A fresh object per request: OMP tags context messages with history indexes.
  pi.on("context", (event, ctx) => {
    if (!needsSection(event.messages, ctx.getSystemPrompt(), section)) return;
    const message: AgentMessage = {
      role: "custom",
      customType: SECTION_MESSAGE_TYPE,
      content: section,
      display: false,
      attribution: "agent",
      timestamp: 0,
    };
    return { messages: [message, ...event.messages] };
  });
}
