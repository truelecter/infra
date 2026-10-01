// On Claude Opus 5.5 (and Fable 5.x), reply text the model writes after a tool
// result and before its next tool call in the same message does not come back
// as a `text` block: the API returns it as a "progress update" `thinking`
// block holding a short summary, and gives the model its original text back on
// the next request. So an explanation written right before an `ask` call
// mid-turn never reaches the user, while the model believes it did. Text that
// ends a turn is not affected. Anthropic documents this in the Opus 5.5
// migration guide ("Text between tool calls").
//
// The gate therefore blocks a bare `ask`, has the model end its turn with the
// explanation as its final reply, and then lets the first `ask` of the
// continuation run through without text.

/** Minimum visible characters before an `ask` call, or in the explaining final reply. */
export const MIN_PREAMBLE_CHARS = 200;

/** Blocked `ask` calls in a row, within one agent run, after which the next one goes through anyway. */
export const MAX_BLOCKS_IN_A_ROW = 3;

/** Hidden message that starts the continuation run after the explanation was shown. */
export const CONTINUE_PROMPT =
  "Your explanation is now shown to the user as your last reply. Call `ask` now with the questions you just explained and the same short labels. Don't repeat the explanation.";

interface Block {
  type?: unknown;
  text?: unknown;
  id?: unknown;
}

export interface MessageLike {
  role?: unknown;
  content?: unknown;
}

/**
 * Trimmed characters of reply text that precede the tool call, or undefined
 * when the call is not part of this message.
 */
export function textBefore(message: MessageLike, toolCallId: string): number | undefined {
  if (!Array.isArray(message.content)) return undefined;
  let chars = 0;
  for (const block of message.content as Block[]) {
    if (block.type === "toolCall" && block.id === toolCallId) return chars;
    if (block.type === "text" && typeof block.text === "string") chars += block.text.trim().length;
  }
  return undefined;
}

/** Block reason for an `ask` call without enough visible text before it, else undefined. */
export function checkAsk(message: MessageLike, toolCallId: string): string | undefined {
  const chars = textBefore(message, toolCallId);
  if (chars === undefined || chars >= MIN_PREAMBLE_CHARS) return undefined;
  return [
    `Blocked: this \`ask\` call has ${chars} characters of visible reply text before it; the user needs an explanation of at least ${MIN_PREAMBLE_CHARS} before the form.`,
    "On this model, reply text written after a tool result and before another tool call in the same message is not shown: the API replaces it with a short summary displayed as thinking, even though your context still holds the full text. Writing the text again before the call will not help.",
    "Instead, end your turn now: reply with the full explanation (each question and each option, with a concrete example and the trade-off) and no tool calls in that message. Text that ends a turn is shown in full.",
    "You will then be asked to continue; call `ask` right away with the same short labels. Don't switch to a plain-text question; the form comes next.",
  ].join(" ");
}

/** Whether the message is a final reply: enough reply text and no tool calls. */
function isExplainingReply(message: MessageLike): boolean {
  if (!Array.isArray(message.content)) return false;
  let chars = 0;
  for (const block of message.content as Block[]) {
    if (block.type === "toolCall") return false;
    if (block.type === "text" && typeof block.text === "string") chars += block.text.trim().length;
  }
  return chars >= MIN_PREAMBLE_CHARS;
}

/**
 * Per-session state for `ask` calls across agent runs:
 * - a bare `ask` is blocked and the model is told to end its turn with the explanation;
 * - when that run ends with an explaining reply, `runEnded` asks for a continuation,
 *   and the first `ask` of the next run goes through without text;
 * - after MAX_BLOCKS_IN_A_ROW blocks in one run, the next `ask` goes through anyway,
 *   so an agent that never ends its turn doesn't loop until it gives up.
 */
export class AskGate {
  #blocked = 0;
  #pending = false;
  #explained = false;

  /** A new agent run starts. */
  runStarted(): void {
    this.#blocked = 0;
  }

  /** Block reason for this `ask` call, or undefined to let it through. */
  check(message: MessageLike, toolCallId: string): string | undefined {
    if (this.#explained || this.#blocked >= MAX_BLOCKS_IN_A_ROW) {
      this.#explained = false;
      this.#pending = false;
      this.#blocked = 0;
      return undefined;
    }
    const reason = checkAsk(message, toolCallId);
    this.#blocked = reason ? this.#blocked + 1 : 0;
    this.#pending = reason !== undefined;
    return reason;
  }

  /**
   * The agent run ended with `lastAssistant` as its final message. Returns true
   * when the caller should start a continuation run with CONTINUE_PROMPT.
   */
  runEnded(lastAssistant: MessageLike | undefined): boolean {
    const pending = this.#pending;
    this.#pending = false;
    this.#explained = pending && lastAssistant !== undefined && isExplainingReply(lastAssistant);
    return this.#explained;
  }
}
