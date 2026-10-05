import { settingsRpc } from "@getpaseo/plugin";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { createWidthSettingsScreen } from "./client/settings-screen.tsx";
import { onWindowFocus, startChatWidener } from "./client/web.ts";
import { chatWidth, DEFAULT_CHAT_WIDTH } from "./shared/settings.ts";

export default function contribute(client: PluginClientContext) {
  const widener = startChatWidener();
  const readSettings = settingsRpc(chatWidth.id).read;
  let stopped = false;

  // Widen right away instead of waiting for the daemon round trip.
  widener?.apply(DEFAULT_CHAT_WIDTH);

  async function refresh() {
    if (!widener) return;
    try {
      const result = await client.rpc(readSettings, {});
      if (stopped) return;
      const parsed = result.status === "ready" ? chatWidth.schema.safeParse(result.values) : null;
      widener.apply(parsed?.success ? parsed.data : DEFAULT_CHAT_WIDTH);
    } catch (error) {
      console.warn("[wide-chat] Could not read settings", error);
    }
  }

  void refresh();
  const stopFocus = onWindowFocus(() => void refresh());

  const removeScreen = client.addSettingsScreen({
    id: "width",
    title: "Chat width",
    icon: "MoveHorizontal",
    Component: createWidthSettingsScreen((width) => widener?.apply(width)),
  });
  const removeCommand = client.addCommandCenterItem({
    id: "width-settings",
    title: "Chat width settings",
    icon: "MoveHorizontal",
    keywords: ["wide", "width", "layout"],
    context: "global",
    onSelect({ openSettings }) {
      openSettings("width");
    },
  });

  return () => {
    stopped = true;
    stopFocus();
    removeCommand();
    removeScreen();
    widener?.stop();
  };
}
