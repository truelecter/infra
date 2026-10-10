import { settingsRpc } from "@getpaseo/plugin";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { createAssignmentSync } from "./client/sync.ts";
import {
  onWindowFocus,
  startSidebarGroups,
  type SidebarGroups,
} from "./client/web.ts";
import { groupSettings } from "./shared/settings.ts";

export default function contribute(client: PluginClientContext) {
  const rpc = settingsRpc(groupSettings.id);
  let sidebar: SidebarGroups | null = null;

  const sync = createAssignmentSync({
    read: () => client.rpc(rpc.read, {}),
    write: (revision, values) => client.rpc(rpc.write, { revision, values }),
    parse: (values) => {
      const parsed = groupSettings.schema.safeParse(values);
      return parsed.success ? parsed.data.assignments : {};
    },
    onChange: (assignments) => sidebar?.setAssignments(assignments),
    onError: (error) =>
      console.warn("[project-groups] Could not sync groups", error),
  });

  sidebar = startSidebarGroups({
    update: (change) => void sync.update(change),
  });
  if (!sidebar) return () => {};

  void sync.refresh();
  // Another window or device may have regrouped projects meanwhile.
  const stopFocus = onWindowFocus(() => void sync.refresh());

  return () => {
    stopFocus();
    sidebar?.stop();
    sidebar = null;
  };
}
