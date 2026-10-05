import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const groupSettings = defineSettings({
  id: "groups",
  scope: "host",
  version: 1,
  schema: z.object({
    // Sidebar project view key -> group path ("work/aws"). An empty path keeps a project out of
    // the group its name would put it in.
    assignments: z.record(z.string(), z.string()).default({}),
  }),
});

export type GroupSettings = z.output<typeof groupSettings.schema>;
