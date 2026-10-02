// On Claude Opus 5.5 (and Fable 5.x), reply text the model writes after a tool
// result and before its next tool call does not come back as a `text` block:
// the API returns it as a "progress update" `thinking` block holding a short
// summary, and gives the model its original text back on the next request. So
// an explanation written right before an `ask` call never reaches the user,
// while the model believes it did. Anthropic documents this in the Opus 5.5
// migration guide ("Text between tool calls") and recommends a tool for
// sending the user a message verbatim, because tool input is never summarized.
//
// The `say` tool is that channel: its Markdown is shown in the chat as a
// message. The gate makes the model use it: an `ask` goes through only when a
// `say` finished earlier in the turn, when enough real reply text precedes the
// call in the same message, or when the previous run ended with an
// explaining reply. A `say` message is shown only after every tool call of
// its assistant message has finished, so `ask` must come in a later message.

/** Custom message type of a `say` message. */
export const SAY_MESSAGE_TYPE = "say";

/** Minimum reply text before an `ask` call, or in an explaining final reply. */
export const MIN_TEXT_CHARS = 200;

/** Blocked `ask` calls in a row, within one agent run, after which the next one goes through anyway. */
export const MAX_BLOCKS_IN_A_ROW = 3;

export const SAY_DESCRIPTION = [
  "Show the user a Markdown message in the chat, verbatim.",
  "Text you write between tool calls may reach the user only as a short summary inside a collapsed thinking block, so use this tool for anything the user must read in full before your turn ends. Above all: before every `ask` form, call `say` with the explanation of each question and option (a concrete example per option and the trade-off), then call `ask` with short labels.",
  "The message appears only after every tool call in the same response has finished, so call `ask` in your next response, after this tool's result, never in the same one.",
  "Don't repeat the message in your reply afterwards. Not for routine status updates.",
].join(" ");

export const SAY_PARAMETER_DESCRIPTION = "Markdown shown to the user as a chat message";

export const SAY_RESULT = "Shown to the user in the chat.";

export const NO_EXPLANATION_REASON = [
  "Blocked: the user has no explanation for this question form yet.",
  "Text you write before a tool call can reach the user only as a short summary inside a collapsed thinking block, so it doesn't count, even if your context shows it in full.",
  "Call `say` now with the full explanation in Markdown (each question and each option, with a concrete example and the trade-off), then call `ask` again in your next response with the same short labels. Keep using the `ask` form; don't switch to a plain-text question.",
].join(" ");

export const SAME_RESPONSE_REASON = [
  "Blocked: a `say` message is shown only after every tool call in its response has finished, so this form would open before the user can read your explanation.",
  "Call `ask` again in your next response, on its own, with the same questions. Don't repeat the explanation.",
].join(" ");

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

/** Whether the message is a final reply: enough reply text and no tool calls. */
export function isExplainingReply(message: MessageLike | undefined): boolean {
  if (!message || !Array.isArray(message.content)) return false;
  let chars = 0;
  for (const block of message.content as Block[]) {
    if (block.type === "toolCall") return false;
    if (block.type === "text" && typeof block.text === "string") chars += block.text.trim().length;
  }
  return chars >= MIN_TEXT_CHARS;
}

/** Per-session state that decides whether an `ask` call may open its form. */
export class AskGate {
  #explained = false;
  #sayInResponse = false;
  #blocked = 0;

  /** A new agent run starts (a user prompt or a continuation). */
  runStarted(): void {
    this.#blocked = 0;
  }

  /** The run ended with `lastAssistant`; an explaining final reply covers the next `ask`. */
  runEnded(lastAssistant: MessageLike | undefined): void {
    this.#explained = isExplainingReply(lastAssistant);
  }

  /** A new assistant response starts streaming. */
  responseStarted(): void {
    this.#sayInResponse = false;
  }

  /** The current response calls `say`. */
  sayCalled(): void {
    this.#sayInResponse = true;
  }

  /** A `say` call finished; its message is shown before the next response. */
  sayShown(): void {
    this.#explained = true;
  }

  /** An `ask` form was answered; the next form needs its own explanation. */
  askAnswered(): void {
    this.#explained = false;
  }

  /**
   * Block reason for an `ask` call, or undefined to let it through.
   * `textChars` is the reply text before the call in its message.
   */
  check(textChars: number): string | undefined {
    if (this.#blocked >= MAX_BLOCKS_IN_A_ROW) {
      this.#blocked = 0;
      return undefined;
    }
    let reason: string | undefined;
    if (this.#sayInResponse) reason = SAME_RESPONSE_REASON;
    else if (!this.#explained && textChars < MIN_TEXT_CHARS) reason = NO_EXPLANATION_REASON;
    this.#blocked = reason ? this.#blocked + 1 : 0;
    return reason;
  }
}
