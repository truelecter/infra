import type { PluginClientContext } from "@getpaseo/plugin/client";
import { BacklogScreen } from "./client/backlog-screen.tsx";

export default function contribute(client: PluginClientContext) {
  const removeSurface = client.addSurface("main", BacklogScreen);
  const removeSidebarItem = client.addSidebarItem({
    id: "backlog",
    title: "Backlog",
    icon: "ListTodo",
    surface: "main",
  });
  return () => {
    removeSidebarItem();
    removeSurface();
  };
}
