// Everything about the season lives here. Change dates, events and the
// training plan in this file; the site, emails and admin panel follow it.

export type Scoring =
  // Points for every unit done, up to a cap. Long run: 10 pts per km, cap 10 km.
  | { kind: "per_unit"; perUnit: number; cap: number }
  // Time against a target. Full points at or under the target, then lose
  // `stepPoints` for every `step` seconds slower, never below `floor`.
  | { kind: "time"; target: number; step: number; stepPoints: number; floor: number };

export type SeasonEvent = {
  id: string;
  name: string;
  weekend: "running" | "strength";
  day: "Sat" | "Sun";
  unit: string; // what the admin types in: km, reps, seconds
  rule: string; // one line shown to participants
  blurb: string;
  scoring: Scoring;
};

export const MAX_PER_EVENT = 100;

export const EVENTS: SeasonEvent[] = [
  {
    id: "long-run",
    name: "Long run",
    weekend: "running",
    day: "Sun",
    unit: "km",
    rule: "10 pts per km · cap 10 km · 80 min limit",
    blurb: "Run as far as you can, up to 10 km. Stop at 5 km and you still bank half.",
    scoring: { kind: "per_unit", perUnit: 10, cap: 10 },
  },
  {
    id: "3k",
    name: "3 km run",
    weekend: "running",
    day: "Sat",
    unit: "time (mm:ss)",
    rule: "100 at 15:00 or under · −5 per 30 s slower · 20 for finishing",
    blurb: "One steady effort against the clock.",
    scoring: { kind: "time", target: 900, step: 30, stepPoints: 5, floor: 20 },
  },
  {
    id: "sprint",
    name: "100 m sprint",
    weekend: "running",
    day: "Sat",
    unit: "time (seconds)",
    rule: "100 at 14.0 s or under · −10 per 0.5 s slower · 20 for finishing",
    blurb: "Two attempts, best time counts.",
    scoring: { kind: "time", target: 14, step: 0.5, stepPoints: 10, floor: 20 },
  },
  {
    id: "push-ups",
    name: "Push-ups",
    weekend: "strength",
    day: "Sat",
    unit: "reps",
    rule: "2 pts per rep · cap 50 reps",
    blurb: "Max strict reps in 2 minutes. Chest to fist height, full lockout.",
    scoring: { kind: "per_unit", perUnit: 2, cap: 50 },
  },
  {
    id: "plank",
    name: "Plank hold",
    weekend: "strength",
    day: "Sat",
    unit: "time (mm:ss)",
    rule: "1 pt per 3 s · cap 5:00",
    blurb: "Forearm plank. Hips drop twice and the clock stops.",
    scoring: { kind: "per_unit", perUnit: 1 / 3, cap: 300 },
  },
  {
    id: "burpees",
    name: "Burpees",
    weekend: "strength",
    day: "Sun",
    unit: "reps",
    rule: "2 pts per rep · cap 50 reps",
    blurb: "Five minutes, chest to floor, jump at the top.",
    scoring: { kind: "per_unit", perUnit: 2, cap: 50 },
  },
];

// Dates are in India Standard Time. Placeholders until the group confirms.
export const TZ = "Asia/Kolkata";
export const SEASON = {
  name: "Winter Arc 2026",
  spots: 7,
  baseline: "2026-10-17T07:00:00+05:30",
  runningWeekend: "2027-01-02T07:00:00+05:30",
  strengthWeekend: "2027-01-09T07:00:00+05:30",
  awards: "2027-01-10T18:00:00+05:30",
};

export const TIMELINE = [
  { when: "Sat 17 Oct", title: "Kickoff + baseline", text: "Everyone tries all six events once. No points, just your starting numbers." },
  { when: "Oct to Dec", title: "Training block", text: "A daily email with today's practice, your streak and the days left." },
  { when: "2 to 3 Jan", title: "Running weekend", text: "Sprint and 3 km on Saturday. The long run on Sunday." },
  { when: "9 to 10 Jan", title: "Strength weekend", text: "Push-ups and plank on Saturday. Burpees on Sunday." },
  { when: "Sun 10 Jan", title: "Awards night", text: "Final board, titles, certificates and your poster." },
];

// Index 0 = Sunday, matching Date.getDay().
export const WEEK_PLAN = [
  { day: "Sun", title: "Rest day", detail: "Off. Walk, eat well, sleep." },
  { day: "Mon", title: "Easy run", detail: "20 to 30 min at talking pace." },
  { day: "Tue", title: "Strength circuit", detail: "4 rounds: 10 push-ups, 20 air squats, 40 s plank, 10 lunges each leg." },
  { day: "Wed", title: "Mobility", detail: "Rest or 15 min of stretching: hips, hamstrings, shoulders." },
  { day: "Thu", title: "Speed", detail: "Warm up 10 min, then 6 × 100 m strides. Walk back between each." },
  { day: "Fri", title: "Burpee ladder", detail: "1 burpee, then 2, up to 10. Finish with 3 × 30 s side plank each side." },
  { day: "Sat", title: "Long run", detail: "Add 1 km every week until you reach 10 km." },
];

export const DRILLS = [
  "Air squats", "Walking lunges", "Incline push-ups", "Knee push-ups", "Mountain climbers",
  "Wall sit", "Dead hang", "Glute bridge", "Jump rope", "Side plank", "Step-ups",
  "Bear crawl", "High knees", "Superman hold",
];

export const AWARDS = [
  { title: "Arc Champion", text: "Most points across all six events." },
  { title: "Iron Lungs", text: "Top score on running weekend." },
  { title: "Steel Core", text: "Top score on strength weekend." },
  { title: "Biggest Leap", text: "Most improved from your baseline." },
];

export const PRACTICE_KINDS = ["Run", "Strength", "Speed", "Burpees", "Mobility", "Other"];

export function nextMilestone(now = new Date()) {
  const list = [
    { label: "Baseline test", at: SEASON.baseline },
    { label: "Running weekend", at: SEASON.runningWeekend },
    { label: "Strength weekend", at: SEASON.strengthWeekend },
    { label: "Awards night", at: SEASON.awards },
  ];
  return list.find((m) => new Date(m.at).getTime() > now.getTime()) ?? list[list.length - 1];
}
