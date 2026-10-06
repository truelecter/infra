import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCardTime } from "./time";

const weekday = (date: Date) => date.toLocaleDateString(undefined, { weekday: "long" });

describe("formatCardTime", () => {
  const now = new Date(2026, 9, 7, 9, 30);

  it("shows only the time on the same calendar day", () => {
    const earlyToday = new Date(2026, 9, 7, 0, 5);
    const label = formatCardTime(earlyToday, now);
    assert.ok(!label.includes(weekday(earlyToday)), label);
    assert.ok(!label.includes("2026"), label);
  });

  it("counts calendar days, not 24-hour spans: late yesterday gets its weekday", () => {
    const lateYesterday = new Date(2026, 9, 6, 23, 55);
    assert.ok(formatCardTime(lateYesterday, now).startsWith(`${weekday(lateYesterday)} `));
  });

  it("names the weekday up to six days back and the date from the seventh", () => {
    const sixDays = new Date(2026, 9, 1, 12, 0);
    const sevenDays = new Date(2026, 8, 30, 12, 0);
    assert.ok(formatCardTime(sixDays, now).startsWith(`${weekday(sixDays)} `));
    const older = formatCardTime(sevenDays, now);
    assert.ok(older.includes("2026"), older);
    assert.ok(!older.startsWith(weekday(sevenDays)), older);
  });

  it("shows the date for a time later than now on another day", () => {
    assert.ok(formatCardTime(new Date(2026, 9, 8, 8, 0), now).includes("2026"));
  });
});
