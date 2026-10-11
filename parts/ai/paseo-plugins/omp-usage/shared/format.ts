/** 4_941_700_000 -> "4.94B", 20_420_000 -> "20.4M", 812 -> "812". */
export function compactNumber(value: number): string {
  const units = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ] as const;
  for (const [size, suffix] of units) {
    if (Math.abs(value) < size) continue;
    const scaled = value / size;
    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    return `${scaled.toFixed(digits).replace(/\.?0+$/, "")}${suffix}`;
  }
  return String(Math.round(value));
}

/** 1664.756 -> "$1,664.76". */
export function dollars(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "global.anthropic.claude-opus-5-5" -> "claude-opus-5-5". */
export function modelName(model: string): string {
  const parts = model.split(".");
  return parts.length > 2 ? parts.slice(2).join(".") : model;
}

/**
 * OMP names a session folder after its working directory relative to the home folder, with
 * `/` turned into `-` ("-Projects-agentic-stuff"); drop the leading dash and the top folder.
 */
export function folderName(folder: string): string {
  const name = folder.replace(/^-+/, "");
  const match = /^(Projects|Workspace|src|code)-(.+)$/.exec(name);
  return match ? match[2]! : name || folder;
}

/** "2026-10-11" -> "11 Oct". */
export function dayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
