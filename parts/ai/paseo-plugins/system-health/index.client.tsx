import type { PluginClientContext } from "@getpaseo/plugin/client";
import { HealthScreen } from "./client/health-screen.tsx";

export default function contribute(client: PluginClientContext) {
  const removeSurface = client.addSurface("main", HealthScreen);
  const removeSidebarItem = client.addSidebarItem({
    id: "system-health",
    title: "System health",
    icon: "Activity",
    surface: "main",
  });
  return () => {
    removeSidebarItem();
    removeSurface();
  };
}
