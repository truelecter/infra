import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const chatWidth = defineSettings({
  id: "width",
  scope: "host",
  version: 1,
  schema: z.object({
    // Share of the agent pane the chat column may use.
    percent: z.number().int().min(50).max(100).default(90),
    // Upper bound in pixels; 0 means no bound.
    maxPx: z.number().int().min(0).max(10000).default(0),
  }),
});

export type ChatWidth = z.output<typeof chatWidth.schema>;

export const DEFAULT_CHAT_WIDTH: ChatWidth = chatWidth.schema.parse({});
