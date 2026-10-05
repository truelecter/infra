import type { PluginClientContext } from "@getpaseo/plugin/client";
import { startHeaderTabName } from "./client/web.ts";

export default function contribute(_client: PluginClientContext) {
  const header = startHeaderTabName();
  return () => {
    header?.stop();
  };
}
