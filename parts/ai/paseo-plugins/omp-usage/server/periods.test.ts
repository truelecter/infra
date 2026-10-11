import assert from "node:assert/strict";
import { test } from "node:test";
import { localDate, periodStarts, rangeStart } from "./periods.ts";
import { costWindow } from "./cost-explorer.ts";

test("a Sunday belongs to the week that started the Monday before", () => {
  const starts = periodStarts(new Date(2026, 9, 11, 18, 30));
  assert.equal(starts.today, new Date(2026, 9, 11).getTime());
  assert.equal(starts.week, new Date(2026, 9, 5).getTime());
  assert.equal(starts.month, new Date(2026, 9, 1).getTime());
});

test("a Monday starts its own week", () => {
  assert.equal(
    periodStarts(new Date(2026, 9, 12, 0, 1)).week,
    new Date(2026, 9, 12).getTime(),
  );
});

test("a week can start in the previous month", () => {
  const starts = periodStarts(new Date(2026, 10, 1, 9));
  assert.equal(starts.week, new Date(2026, 9, 26).getTime());
  assert.equal(starts.month, new Date(2026, 10, 1).getTime());
});

test("30 days covers today and the 29 days before", () => {
  assert.equal(
    localDate(rangeStart("30d", new Date(2026, 9, 11, 12))),
    "2026-09-12",
  );
});

test("the Cost Explorer window covers the month and 30 days, ending tomorrow", () => {
  assert.deepEqual(costWindow(new Date(2026, 9, 11, 12)), {
    start: "2026-09-12",
    end: "2026-10-12",
  });
  // Late in a 31-day month the 1st is further back than 29 days.
  assert.deepEqual(costWindow(new Date(2026, 9, 31, 12)), {
    start: "2026-10-01",
    end: "2026-11-01",
  });
});
