import { test } from "node:test";
import assert from "node:assert/strict";
import { points, parseValue, standings } from "./scoring.ts";
import { EVENTS } from "./season.ts";

const ev = (id: string) => EVENTS.find((e) => e.id === id)!.scoring;

test("per-unit events cap at 100", () => {
  assert.equal(points(ev("long-run"), 5), 50);
  assert.equal(points(ev("long-run"), 25), 100);
  assert.equal(points(ev("long-run"), 1), 10);
  assert.equal(points(ev("push-ups"), 37), 74);
  assert.equal(points(ev("plank"), 300), 100);
  assert.equal(points(ev("plank"), 90), 30);
});

test("timed events lose points per step and keep a floor", () => {
  assert.equal(points(ev("3k"), 900), 100);
  assert.equal(points(ev("3k"), 901), 95);
  assert.equal(points(ev("3k"), 960), 90);
  assert.equal(points(ev("3k"), 3000), 20);
  assert.equal(points(ev("sprint"), 13.2), 100);
  assert.equal(points(ev("sprint"), 14.5), 90);
  assert.equal(points(ev("sprint"), 15.1), 70);
  assert.equal(points(ev("sprint"), 0), 0);
});

test("parses times and numbers", () => {
  assert.equal(parseValue("15:30"), 930);
  assert.equal(parseValue("14.2"), 14.2);
  assert.equal(parseValue("abc"), null);
});

test("standings total, rank and limit", () => {
  const people = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
  const vals: Record<string, number> = { "long-run": 10, "3k": 900, sprint: 14, "push-ups": 20, plank: 300, burpees: 50 };
  const res = Object.entries(vals).map(([event_id, value]) => ({ participant_id: "a", event_id, value, baseline: false }));
  res.push({ participant_id: "b", event_id: "long-run", value: 5, baseline: false });
  const [first, second] = standings(people, res);
  assert.equal(first.id, "a");
  assert.equal(first.total, 540);
  assert.equal(first.limit, "Push-ups");
  assert.equal(second.total, 50);
  assert.equal(second.limit, null);
});
