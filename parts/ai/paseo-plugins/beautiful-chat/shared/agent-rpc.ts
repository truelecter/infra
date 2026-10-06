import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/**
 * Rewind and Fork, rebuilt for the cards that replace Paseo's rows.
 *
 * Paseo draws its Rewind menu inside its own prompt row and its Fork button in
 * its own reply footer, and a plugin that replaces those rows removes both.
 * Plugin code reaches the daemon's rewind and fork context only through
 * `rewind()` and `forkContext()` on the SDK agent handle, which Paseo builds
 * with the agent SDK patches have and released versions so far do not. So the
 * calls run on the daemon side, and a host without the methods offers neither
 * action instead of failing.
 */
export const RewindModeSchema = z.enum(["conversation", "files", "both"]);
export type RewindMode = z.infer<typeof RewindModeSchema>;

/** What the agent offers: its provider's rewind modes, and whether it can be forked. */
export const agentActionsRpc = defineRpc({
  name: "agent.actions",
  input: z.object({ agentId: z.string() }),
  output: z.object({ rewindModes: z.array(RewindModeSchema), fork: z.boolean() }),
});

/** Rewinds the agent to the user message `messageId`; `error` is null on success. */
export const rewindRpc = defineRpc({
  name: "agent.rewind",
  input: z.object({ agentId: z.string(), messageId: z.string(), mode: RewindModeSchema }),
  output: z.object({ error: z.string().nullable() }),
});

/**
 * Starts a new agent in the source agent's workspace, with the same provider
 * settings, the source chat's history up to `boundaryMessageId` (everything
 * when omitted) as an attachment, and `prompt` as its first message.
 */
export const forkRpc = defineRpc({
  name: "agent.fork",
  input: z.object({
    agentId: z.string(),
    boundaryMessageId: z.string().optional(),
    prompt: z.string().min(1),
  }),
  output: z.object({ agentId: z.string().nullable(), error: z.string().nullable() }),
});
