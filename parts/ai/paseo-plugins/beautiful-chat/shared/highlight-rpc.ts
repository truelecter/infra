import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** One coloured run of text inside a line. */
const highlightToken = z.object({
  text: z.string(),
  /** `#rrggbb`, or null when the theme gives the token no colour. */
  color: z.string().nullable(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
});

/** A single code line, as its tokens in reading order. */
const highlightLine = z.array(highlightToken);

/**
 * Tokenises a code block with TextMate grammars.
 *
 * The grammars live on the daemon, not in the client, for two reasons. The
 * client bundle is evaluated when the app starts, and the grammar and theme
 * data is megabytes, so shipping it there would cost every launch. The daemon
 * also has no bundle budget, so it can carry every language the chat may show
 * instead of the handful a client-side highlighter could afford.
 *
 * The response is plain data: the client walks `lines` and paints each token,
 * and needs no highlighter of its own.
 */
export const highlightRpc = defineRpc({
  // The host accepts lower-case, dotted RPC names only.
  name: "highlight.tokens",
  input: z.object({
    code: z.string(),
    /** A language hint such as "typescript", "bash", "diff", or a file name. */
    language: z.string().optional(),
    filename: z.string().optional(),
    dark: z.boolean(),
    diffBodyCode: z.string().optional(),
  }),
  output: z.object({
    /** One entry per code line, in order; each line is its tokens in order. */
    lines: z.array(highlightLine),
    diffLines: z.array(highlightLine).optional(),
    /** The resolved shiki language id, or null when nothing matched and the text came back unhighlighted. */
    language: z.string().nullable(),
    theme: z.string(),
  }),
});

export type HighlightToken = z.infer<typeof highlightToken>;
export type HighlightLine = z.infer<typeof highlightLine>;
