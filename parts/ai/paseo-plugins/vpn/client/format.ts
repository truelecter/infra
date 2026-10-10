import type { PluginTheme } from "@getpaseo/plugin";

/** Label and colour for a Tunnelblick state; anything in between is shown as in progress. */
export function describeState(
  state: string,
  theme: PluginTheme,
): { label: string; color: string } {
  switch (state) {
    case "CONNECTED":
      return { label: "Connected", color: theme.colors.statusSuccess };
    case "EXITING":
    case "DISCONNECTED":
      return { label: "Disconnected", color: theme.colors.foregroundMuted };
    case "PASSWORD_WAIT":
      return {
        label: "Waiting for the password in Tunnelblick",
        color: theme.colors.statusWarning,
      };
    case "SLEEP":
      return { label: "Asleep", color: theme.colors.foregroundMuted };
    default: {
      const words = state.toLowerCase().replaceAll("_", " ");
      return {
        label: words.charAt(0).toUpperCase() + words.slice(1),
        color: theme.colors.statusWarning,
      };
    }
  }
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}
