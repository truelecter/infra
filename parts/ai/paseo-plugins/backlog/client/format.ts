import type { PluginTheme } from "@getpaseo/plugin";
import type { Status } from "../shared/backlog.ts";

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  waiting: "Waiting",
  done: "Done",
};

export function statusColor(theme: PluginTheme, status: Status): string {
  if (status === "done") return theme.colors.statusSuccess;
  if (status === "waiting") return theme.colors.statusWarning;
  return theme.colors.accent;
}

/** `2026-09-30 14:05` in the device's time zone. */
export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
