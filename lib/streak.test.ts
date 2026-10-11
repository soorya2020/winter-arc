import { test } from "node:test";
import assert from "node:assert/strict";
import { longest, streak } from "./streak.ts";

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
