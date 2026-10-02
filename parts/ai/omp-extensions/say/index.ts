import { setTimeout as sleep } from "node:timers/promises";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import {
  AskGate,
  SAY_DESCRIPTION,
  SAY_MESSAGE_TYPE,
  SAY_PARAMETER_DESCRIPTION,
  SAY_RESULT,
  textBefore,
  type MessageLike,
} from "./shared/gate.ts";

// OMP runs `tool_call` hooks before the assistant message's `message_end`, and
// the event carries no message. `message_update` events do carry the partial
// message, but OMP delivers them to extensions through a queue, so the update
// holding the `ask` call can land a moment after `tool_call` fires. Wait for it
// briefly; if it never shows up, judge the call as if no reply text preceded it.
const WAIT_MS = 1000;
const POLL_MS = 10;

export default function say(pi: ExtensionAPI): void {
  let latest: MessageLike | undefined;
  const gate = new AskGate();
  const z = pi.zod;

  pi.registerTool({
    name: "say",
    label: "Say",
    description: SAY_DESCRIPTION,
    parameters: z.object({ message: z.string().describe(SAY_PARAMETER_DESCRIPTION) }),
    // Declared from the first request: adding a tool mid-session invalidates earlier thinking blocks.
    loadMode: "essential",
    approval: "read",
    async execute(_toolCallId, params) {
      // "aside" shows the message at the next step boundary without interrupting
      // the current tool batch; a steering message could skip the remaining calls.
      pi.sendMessage(
        { customType: SAY_MESSAGE_TYPE, content: params.message, display: true, attribution: "agent" },
        { deliverAs: "aside" },
      );
      return { content: [{ type: "text", text: SAY_RESULT }] };
    },
  });

  // Without `ask` (subagents, print mode) nobody reads a `say` message.
  pi.on("session_start", async () => {
    const active = pi.getActiveTools();
    if (!active.includes("ask") && active.includes("say")) {
      await pi.setActiveTools(active.filter((name) => name !== "say"));
    }
  });

  // The model already has the text in its `say` call; as a custom message it
  // would reach the model a second time, as if the user had written it.
  pi.on("context", (event) => ({
    messages: event.messages.filter((m) => !(m.role === "custom" && m.customType === SAY_MESSAGE_TYPE)),
  }));

  pi.on("agent_start", () => gate.runStarted());

  pi.on("agent_end", (event) => {
    // The session retries on its own (empty or unexpected stop); wait for the real end.
    if (event.willContinue) return;
    gate.runEnded(event.messages.findLast((m) => m.role === "assistant"));
  });

  pi.on("turn_start", () => gate.responseStarted());

  pi.on("message_update", (event) => {
    if (event.message.role === "assistant") latest = event.message;
  });

  pi.on("tool_call", async (event) => {
    if (event.toolName === "say") {
      gate.sayCalled();
      return;
    }
    if (event.toolName !== "ask") return;
    const deadline = Date.now() + WAIT_MS;
    let chars = latest && textBefore(latest, event.toolCallId);
    while (chars === undefined && Date.now() < deadline) {
      await sleep(POLL_MS);
      chars = latest && textBefore(latest, event.toolCallId);
    }
    const reason = gate.check(chars ?? 0);
    if (reason) return { block: true, reason };
  });

  pi.on("tool_execution_end", (event) => {
    if (event.isError) return;
    if (event.toolName === "say") gate.sayShown();
    else if (event.toolName === "ask") gate.askAnswered();
  });
}
