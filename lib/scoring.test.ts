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

import { trashTalk, comeback, pickTarget, type Talker } from "./trash.ts";

const base = (o: Partial<Talker>): Talker => ({ id: "x", name: "X", rank: 1, total: 0, streak: 0, limit: null, best: null, catchphrase: null, profile: {}, ...o });

test("trash talk uses the target's questionnaire answers", () => {
  const a = base({ id: "a", name: "Arjun", rank: 1, profile: { tone: "Savage" } });
  const b = base({ id: "b", name: "Rahul", rank: 2, profile: { excuse: "It looked like rain", weakness: "Midnight biryani" } });
  const lines = new Set<string>();
  for (let i = 0; i < 200; i++) lines.add(trashTalk(a, b));
  assert.ok([...lines].some((l) => l.includes("It looked like rain")));
  assert.ok([...lines].some((l) => l.includes("Midnight biryani")));
  assert.ok([...lines].every((l) => l.length > 0 && !l.includes("undefined") && !l.includes("null")));
});

test("every tone produces a line even with an empty profile", () => {
  for (const tone of ["Savage", "Playful", "Dad jokes", "Cold and quiet"] as const) {
    for (let i = 0; i < 50; i++) {
      const l = trashTalk(base({ profile: { tone } }), base({ name: "B", rank: 3 }));
      assert.ok(l && !l.includes("undefined"), `${tone}: ${l}`);
      assert.ok(comeback(base({}), base({})));
    }
  }
});

test("rival gets picked about half the time", () => {
  const pool = [{ id: "r" }, { id: "s" }, { id: "t" }, { id: "u" }];
  let hits = 0;
  for (let i = 0; i < 2000; i++) if (pickTarget(base({ profile: { rivalId: "r" } }), pool)?.id === "r") hits++;
  assert.ok(hits > 1000 && hits < 1500, String(hits));
});

test("friends get roasted with their honest answers", () => {
  const a = base({ name: "Arjun", profile: { maxPushups: 60 } });
  const b = base({ name: "Rahul", rank: 2, profile: { trainingSince: "Under 6 months", toughest: "Climbing Chembra peak", goal: "Run 10 km without stopping", fail: "Fell off the treadmill", bestRun: 5, maxPushups: 12 } });
  const lines = new Set<string>();
  for (let i = 0; i < 400; i++) lines.add(trashTalk(a, b));
  for (const bit of ["Under 6 months", "Climbing Chembra peak", "run 10 km", "Fell off the treadmill", "5 km", "12 push-ups"]) {
    assert.ok([...lines].some((l) => l.includes(bit)), bit);
  }
});
