import { setTimeout as sleep } from "node:timers/promises";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { AskGate, CONTINUE_PROMPT, textBefore, type MessageLike } from "./shared/preamble.ts";

// OMP runs `tool_call` hooks before the assistant message's `message_end`, and
// the event carries no message. `message_update` events do carry the partial
// message, but OMP delivers them to extensions through a queue, so the update
// holding the `ask` call can land a moment after `tool_call` fires. Wait for it
// briefly; if it never shows up, let the call through rather than guess.
const WAIT_MS = 1000;
const POLL_MS = 10;

export default function askPreamble(pi: ExtensionAPI): void {
  let latest: MessageLike | undefined;
  const gate = new AskGate();

  pi.on("agent_start", () => gate.runStarted());

  pi.on("message_update", (event) => {
    if (event.message.role === "assistant") latest = event.message;
  });

  pi.on("tool_call", async (event) => {
    if (event.toolName !== "ask") return;
    const deadline = Date.now() + WAIT_MS;
    while (!latest || textBefore(latest, event.toolCallId) === undefined) {
      if (Date.now() >= deadline) return;
      await sleep(POLL_MS);
    }
    const reason = gate.check(latest, event.toolCallId);
    if (reason) return { block: true, reason };
  });

  pi.on("agent_end", (event) => {
    // The session retries on its own (empty or unexpected stop); wait for the real end.
    if (event.willContinue) return;
    const lastAssistant = event.messages.findLast((m) => m.role === "assistant");
    if (!gate.runEnded(lastAssistant)) return;
    pi.sendMessage(
      { customType: "ask-preamble-continue", content: CONTINUE_PROMPT, display: false, attribution: "agent" },
      { deliverAs: "nextTurn", triggerTurn: true },
    );
  });
}
