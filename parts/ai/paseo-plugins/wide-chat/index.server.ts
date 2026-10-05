import type { PluginServerContext } from "@getpaseo/plugin/server";
import { chatWidth } from "./shared/settings.ts";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(chatWidth);
  return () => {};
}
