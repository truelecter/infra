/** The selected tab of one pane, as read from the tabs row. */
export interface SelectedTab {
  label: string;
  /** True when the tab's pane has focus. */
  focused: boolean;
}

/**
 * The tab name to show beside the workspace title, or null to show none.
 *
 * Each pane has a selected tab; the one in the focused pane wins. Without a focused pane (focus is
 * elsewhere in the window) the first pane's tab stands in. A name that only repeats the workspace
 * title is dropped, the way Paseo drops a project name that repeats it.
 */
export function pickTabName(
  tabs: readonly SelectedTab[],
  workspaceTitle: string,
): string | null {
  const tab = tabs.find((candidate) => candidate.focused) ?? tabs[0];
  const label = tab?.label.trim() ?? "";
  if (!label || label === workspaceTitle.trim()) return null;
  return label;
}
