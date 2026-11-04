import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { BacklogScreen } from "./client/backlog-screen.tsx";

function BacklogSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="ListTodo"
      active={currentScreen?.screenId === "main"}
      onPress={() => openScreen({ screenId: "main" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  const removeScreen = client.addScreen({ id: "main", title: "Backlog", Component: BacklogScreen });
  const removeSidebarItem = client.addSidebarHeaderItem({
    id: "backlog",
    title: "Backlog",
    Component: BacklogSidebarItem,
  });
  return () => {
    removeSidebarItem();
    removeScreen();
  };
}
