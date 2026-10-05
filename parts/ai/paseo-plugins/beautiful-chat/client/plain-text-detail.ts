/**
 * Paseo 0.11 maps several OMP tools (eval, ask, wait, think, yield, the
 * github device and others) to a `plain_text` detail: a label and the result
 * text, without the call's arguments. Paseo 0.10 sent the same calls as
 * `unknown` with the raw `input` and `output`, which is what the cards read,
 * so a card has to fall back to the label and text when there is no input.
 */
export interface PlainTextDetail {
  label?: string;
  text?: string;
}

export function readPlainTextDetail(detail: Record<string, unknown>): PlainTextDetail | null {
  if (detail.type !== "plain_text") return null;
  const { label, text } = detail;
  return {
    label: typeof label === "string" && label.trim() ? label : undefined,
    text: typeof text === "string" && text.trim() ? text : undefined,
  };
}

const NO_SELECTION = "No selection";

/**
 * The answers in a `plain_text` ask result.
 *
 * Paseo writes one `question\nanswer` block per question, blocks separated by
 * a blank line, and "No selection" for a question left unanswered. When it
 * cannot read the answers it passes the tool's own text instead, which has no
 * question line; that yields nothing here so the caller can read it as prose.
 */
export function extractPlainAskAnswers(text: string | undefined): string[] {
  if (!text) return [];
  return text.split(/\n\s*\n/).flatMap((block) => {
    const lines = block.trim().split("\n");
    if (lines.length < 2) return [];
    const answer = lines.slice(1).join("\n").trim();
    return answer && answer !== NO_SELECTION ? [answer] : [];
  });
}
