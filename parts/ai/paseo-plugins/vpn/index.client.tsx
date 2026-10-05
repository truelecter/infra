import type { PluginClientContext } from "@getpaseo/plugin/client";
import { VpnScreen } from "./client/vpn-screen.tsx";

export default function contribute(client: PluginClientContext) {
  const removeSurface = client.addSurface("main", VpnScreen);
  const removeSidebarItem = client.addSidebarItem({
    id: "vpn",
    title: "VPN",
    icon: "ShieldCheck",
    surface: "main",
  });
  return () => {
    removeSidebarItem();
    removeSurface();
  };
}
