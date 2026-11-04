import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { HealthScreen } from "./client/health-screen.tsx";

function HealthSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="Activity"
      active={currentScreen?.screenId === "main"}
      onPress={() => openScreen({ screenId: "main" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  const removeScreen = client.addScreen({ id: "main", title: "System health", Component: HealthScreen });
  const removeItem = client.addSidebarHeaderItem({
    id: "system-health",
    title: "System health",
    Component: HealthSidebarItem,
  });
  return () => {
    removeItem();
    removeScreen();
  };
}
