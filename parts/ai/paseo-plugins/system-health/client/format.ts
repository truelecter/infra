/** Bytes in binary units, one decimal from GB up: `812 MB`, `3.4 GB`. */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit >= 3 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** A duration in its two largest units: `8d 3h`, `5h 2m`, `4m`, `12s`. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes) return `${minutes}m`;
  return `${s}s`;
}

/** A per-second rate, compact: `0/s`, `310/s`, `12.4k/s`. */
export function formatRate(perSecond: number): string {
  if (perSecond >= 10_000) return `${Math.round(perSecond / 1000)}k/s`;
  if (perSecond >= 1000) return `${(perSecond / 1000).toFixed(1)}k/s`;
  return `${Math.round(perSecond)}/s`;
}
