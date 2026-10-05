import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/**
 * Reads an image file so the chat can show it.
 *
 * A read of a `.png` arrives as a tool call whose `code` is the reader's
 * placeholder text, because the bytes never travel through the timeline. The
 * client cannot reach the filesystem either, so the daemon side loads the file
 * and returns it as a data URI, along with the pixel size read out of the
 * file's own header.
 *
 * `dataUri` is null whenever the file cannot be shown — missing, too large,
 * not an image — and `error` says which.
 */
export const imageRpc = defineRpc({
  // The host accepts lower-case, dotted RPC names only.
  name: "file.image",
  input: z.object({
    cwd: z.string(),
    path: z.string(),
  }),
  output: z.object({
    dataUri: z.string().nullable(),
    mime: z.string().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    bytes: z.number().nullable(),
    error: z.string().nullable(),
  }),
});
