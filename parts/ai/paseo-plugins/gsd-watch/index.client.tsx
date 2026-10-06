import type { PluginClientContext, PluginPanelLocation } from "@getpaseo/plugin/client";
import { Dimensions, Platform } from "react-native";
import { GsdPanel } from "./client/gsd-panel.tsx";

/**
 * Paseo shows plugin panels in the Explorer only in its desktop layout (web or desktop app, window
 * at its `md` breakpoint of 720 px or wider). The phone and tablet apps, and narrow windows, have a
 * compact Explorer with just Files, Changes, and PR, so there the panel opens as a workspace tab.
 */
function panelLocation(): PluginPanelLocation {
  return Platform.OS === "web" && Dimensions.get("window").width >= 720 ? "explorer" : "workspace";
}

export default function contribute(client: PluginClientContext) {
  const removers = [
    client.addWorkspacePanel({
      id: "gsd",
      title: "GSD",
      icon: "ListTree",
      context: "workspace",
      locations: ["workspace", "explorer"],
      Component: GsdPanel,
    }),
    client.addCommandCenterItem({
      id: "open-gsd",
      title: "Open GSD project status",
      icon: "ListTree",
      keywords: ["gsd", "planning", "phases", "roadmap", "watch"],
      context: "workspace",
      onSelect({ openPanel }) {
        openPanel("gsd", { location: panelLocation() });
      },
    }),
    // Like gsd-watch's `/gsd-watch`: opens the status next to the chat; nothing is sent to the agent.
    client.addSlashCommand({
      name: "gsd-watch",
      description: "Open the live GSD project status",
      argumentHint: "",
      context: "workspace",
      onSubmit({ openPanel }) {
        openPanel("gsd", { location: panelLocation() });
      },
    }),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
