/**
 * The time a card shows, worded like Paseo's own message times
 * (`formatMessageTimestamp` in its `utils/time.ts`), so a card reads the same
 * as the prompt and reply around it:
 * - same day: `22:11` or `10:11 PM`, following the system's 12/24-hour choice
 * - the previous six calendar days: `Wednesday 22:11`
 * - older: `14 May 2026, 22:11`
 */
export function formatCardTime(date: Date, now: Date = new Date()): string {
  const time = timeFormatter().format(date);
  const daysAgo = calendarDaysBetween(date, now);
  if (daysAgo === 0) return time;
  if (daysAgo > 0 && daysAgo < 7) {
    return `${date.toLocaleDateString(undefined, { weekday: "long" })} ${time}`;
  }
  const day = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${day}, ${time}`;
}

let cachedFormatter: Intl.DateTimeFormat | undefined;

// Carrying `hourCycle` over from the resolved options is what makes the
// runtime follow the system's 12/24-hour setting instead of the locale default.
function timeFormatter(): Intl.DateTimeFormat {
  if (cachedFormatter) return cachedFormatter;
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const { hourCycle } = new Intl.DateTimeFormat(
    undefined,
    options,
  ).resolvedOptions();
  cachedFormatter = new Intl.DateTimeFormat(
    undefined,
    hourCycle ? { ...options, hourCycle } : options,
  );
  return cachedFormatter;
}

/**
 * Local midnights between two instants: 0 the same day, 1 for yesterday.
 * Rounded, so a daylight-saving day of 23 or 25 hours still counts as one.
 */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const from = new Date(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate(),
  );
  const to = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
