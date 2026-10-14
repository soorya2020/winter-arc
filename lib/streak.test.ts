import { test } from "node:test";
import assert from "node:assert/strict";
import { countedDays, longest, streak } from "./streak.ts";

test("longest finds the best run, ignoring gaps and duplicates", () => {
  assert.equal(longest([]), 0);
  assert.equal(longest(["2026-10-01"]), 1);
  assert.equal(longest(["2026-10-01", "2026-10-02", "2026-10-02", "2026-10-04", "2026-10-05", "2026-10-06"]), 3);
  assert.equal(longest(["2026-10-31", "2026-11-01", "2026-11-02"]), 3);
});

test("streak counts back from today, or yesterday if today isn't logged", () => {
  const now = new Date("2026-10-11T06:00:00Z");
  assert.equal(streak(["2026-10-09", "2026-10-10", "2026-10-11"], now), 3);
  assert.equal(streak(["2026-10-09", "2026-10-10"], now), 2);
  assert.equal(streak(["2026-10-08"], now), 0);
});

test("a claimed streak keeps counting by itself and restarts after a slip", () => {
  const set = new Date("2026-10-11T06:00:00Z"), later = new Date("2026-10-14T06:00:00Z");
  const claim = { days: 12, on: "2026-10-11" };
  assert.equal(streak(countedDays([], [], claim, set), set), 12);
  assert.equal(streak(countedDays([], [], claim, later), later), 15);
  assert.equal(streak(countedDays([], ["2026-10-12"], claim, later), later), 2);
  assert.ok(!countedDays([], ["2026-10-14"], claim, later).includes("2026-10-14"), "a slip today doesn't count");
  assert.equal(streak(countedDays([], ["2026-10-05"], claim, set), set), 12, "older slips don't override the member's number");
  assert.deepEqual(countedDays(["2026-10-01"], [], null, set), ["2026-10-01"]);
});

test("a slip ends the run but the best before it stays", () => {
  const now = new Date("2026-10-14T06:00:00Z");
  const claim = { days: 30, on: "2026-10-11" }; // 30 days in on Oct 11, so the run started Sep 12
  const days = countedDays([], ["2026-10-12"], claim, now);
  assert.equal(streak(days, now), 2);
  assert.equal(longest(days), 30);
});
