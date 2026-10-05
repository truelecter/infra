import type { PluginServerContext } from "@getpaseo/plugin/server";
import { groupSettings } from "./shared/settings.ts";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(groupSettings);
  return () => {};
}
