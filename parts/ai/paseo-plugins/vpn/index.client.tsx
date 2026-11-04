import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { VpnScreen } from "./client/vpn-screen.tsx";

function VpnSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="ShieldCheck"
      active={currentScreen?.screenId === "main"}
      onPress={() => openScreen({ screenId: "main" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  const removeScreen = client.addScreen({ id: "main", title: "VPN", Component: VpnScreen });
  const removeItem = client.addSidebarHeaderItem({
    id: "vpn",
    title: "VPN",
    Component: VpnSidebarItem,
  });
  return () => {
    removeItem();
    removeScreen();
  };
}
