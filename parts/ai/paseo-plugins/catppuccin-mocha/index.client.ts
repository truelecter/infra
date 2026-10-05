import type { PluginClientContext } from "@getpaseo/plugin/client";
import { mochaTheme } from "./client/theme.ts";

export default function contribute(client: PluginClientContext) {
  const removeTheme = client.addTheme(mochaTheme);
  return () => {
    removeTheme();
  };
}
