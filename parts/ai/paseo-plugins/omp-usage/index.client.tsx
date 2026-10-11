import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { StatsScreen } from "./client/stats-screen.tsx";

function StatsSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="ChartColumn"
      active={currentScreen?.screenId === "stats"}
      onPress={() => openScreen({ screenId: "stats" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  const removeScreen = client.addScreen({ id: "stats", title: "OMP usage", Component: StatsScreen });
  const removeItem = client.addSidebarFooterItem({ id: "stats", title: "OMP usage", Component: StatsSidebarItem });
  return () => {
    removeItem();
    removeScreen();
  };
}
