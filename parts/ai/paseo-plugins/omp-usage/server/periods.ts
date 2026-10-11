import type { Range } from "../shared/stats.ts";

export interface PeriodStarts {
  today: number;
  week: number;
  month: number;
}

/** Local midnight today, of the last Monday, and of the 1st of the month, in ms. */
export function periodStarts(now: Date): PeriodStarts {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sinceMonday = (today.getDay() + 6) % 7;
  const week = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - sinceMonday,
  );
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    today: today.getTime(),
    week: week.getTime(),
    month: month.getTime(),
  };
}

/** Start of a screen range in ms; "30d" is today and the 29 days before it. */
export function rangeStart(range: Range, now: Date): number {
  if (range !== "30d") return periodStarts(now)[range];
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 29,
  ).getTime();
}

/** Local calendar date of a timestamp, YYYY-MM-DD, the format SQLite's `date()` and Cost Explorer use. */
export function localDate(ms: number): string {
  const at = new Date(ms);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}
