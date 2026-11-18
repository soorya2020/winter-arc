import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLog, currentRanks, toCsv } from "./pointsLog.ts";

const people = [{ id: "a", name: "Anu" }, { id: "b", name: "Bala" }];

test("log replays entries in order with running totals and ranks", () => {
  const results = [
    { participant_id: "b", event_id: "push-ups", value: 50, baseline: false, at: "2026-11-02T10:00:00Z" },
    { participant_id: "a", event_id: "push-ups", value: 20, baseline: false, at: "2026-11-01T10:00:00Z" },
    { participant_id: "a", event_id: "push-ups", value: 5, baseline: true, at: "2026-10-01T10:00:00Z" },
  ];
  const bonuses = [{ participant_id: "a", points: 70, reason: "Hosted, \"chief\"", at: "2026-11-03T10:00:00Z" }];
  const log = buildLog(people, results, bonuses, "Asia/Kolkata");
  assert.deepEqual(log.map((e) => [e.member, e.event, e.points, e.running_total, e.rank_after]), [
    ["Anu", "Push-ups", 40, 40, 1],
    ["Bala", "Push-ups", 100, 100, 1],
    ["Anu", "Bonus", 70, 110, 1],
  ]);
  assert.equal(log[0].day, "2026-11-01");
  const ranks = currentRanks(people, results, bonuses);
  assert.deepEqual(ranks.map((r) => [r.rank, r.member, r.total]), [[1, "Anu", 110], [2, "Bala", 100]]);
  const csv = toCsv(log, ["member", "result"]);
  assert.equal(csv.split("\n")[3], 'Anu,"Hosted, ""chief"""');
});

test("members not on the roster are left out", () => {
  const log = buildLog(people, [{ participant_id: "x", event_id: "push-ups", value: 10, baseline: false, at: "2026-11-01T00:00:00Z" }]);
  assert.equal(log.length, 0);
});
