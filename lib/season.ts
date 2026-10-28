// Everything about the season lives here. Change dates, events and the
// training plan in this file; the site, emails and admin panel follow it.

export type Scoring =
  // Points for every unit done, up to a cap. Long run: 10 pts per km, cap 10 km.
  | { kind: "per_unit"; perUnit: number; cap: number }
  // Time against a target. Full points at or under the target, then lose
  // `stepPoints` for every `step` seconds slower, never below `floor`.
  | { kind: "time"; target: number; step: number; stepPoints: number; floor: number }
  // Rules not decided yet. Results can still be entered; they score once a rule replaces this.
  | { kind: "tba" };

// Event-day categories, in the order they're shown.
export const CATEGORIES = [
  { id: "strength", name: "Strength", short: "Strength" },
  { id: "last-man", name: "Last Man Standing", short: "Last man" },
  { id: "explosive", name: "Explosive & Endurance", short: "Explosive" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type SeasonEvent = {
  id: string;
  name: string;
  category: CategoryId;
  unit: string; // what the admin types in: km, reps, seconds
  rule: string; // one line shown to participants
  blurb: string;
  scoring: Scoring;
};

export const MAX_PER_EVENT = 100;

export const EVENTS: SeasonEvent[] = [
  {
    id: "push-ups",
    name: "Push-ups",
    category: "strength",
    unit: "reps",
    rule: "2 pts per rep · cap 50 reps",
    blurb: "Max strict reps in 2 minutes. Chest to fist height, full lockout.",
    scoring: { kind: "per_unit", perUnit: 2, cap: 50 },
  },
  {
    id: "burpees",
    name: "Burpees",
    category: "strength",
    unit: "reps",
    rule: "2 pts per rep · cap 50 reps",
    blurb: "Five minutes, chest to floor, jump at the top.",
    scoring: { kind: "per_unit", perUnit: 2, cap: 50 },
  },
  {
    id: "plank",
    name: "Plank hold",
    category: "last-man",
    unit: "time (mm:ss)",
    rule: "1 pt per 3 s · cap 5:00",
    blurb: "Forearm plank. Hips drop twice and the clock stops.",
    scoring: { kind: "per_unit", perUnit: 1 / 3, cap: 300 },
  },
  {
    id: "sit-ups",
    name: "Sit-ups",
    category: "last-man",
    unit: "reps",
    rule: "Points TBA",
    blurb: "Keep going until you can't. Last one still moving wins.",
    scoring: { kind: "tba" },
  },
  {
    id: "sprint",
    name: "100 m sprint",
    category: "explosive",
    unit: "time (seconds)",
    rule: "100 at 14.0 s or under · −10 per 0.5 s slower · 20 for finishing",
    blurb: "Two attempts, best time counts.",
    scoring: { kind: "time", target: 14, step: 0.5, stepPoints: 10, floor: 20 },
  },
  {
    id: "long-run",
    name: "Long run",
    category: "explosive",
    unit: "km",
    rule: "10 pts per km · cap 10 km · 80 min limit",
    blurb: "Run as far as you can in 80 minutes, up to 10 km. Stop at 5 km and you still bank half.",
    scoring: { kind: "per_unit", perUnit: 10, cap: 10 },
  },
  {
    id: "dead-hang",
    name: "Dead hang",
    category: "explosive",
    unit: "time (mm:ss)",
    rule: "Points TBA",
    blurb: "Hang from the bar, arms straight. Clock stops when you let go.",
    scoring: { kind: "tba" },
  },
];

/** Events that score points right now (rules decided). */
export const SCORED_EVENTS = EVENTS.filter((e) => e.scoring.kind !== "tba");

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
  { when: "Sat 17 Oct", title: "Kickoff + baseline", text: "Everyone tries every event once. No points, just your starting numbers." },
  { when: "Oct to Dec", title: "Training block", text: "A daily email with today's practice, your streak and the days left." },
  { when: "2 to 3 Jan", title: "Running weekend", text: "Explosive & Endurance: sprint, timed long run and dead hang." },
  { when: "9 to 10 Jan", title: "Strength weekend", text: "Strength: push-ups and burpees. Last Man Standing: plank and sit-ups." },
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

/** Today tab's "Hard truth": one per day, in order. Keep each one a real finding, worded no stronger than its source. */
export const HARD_TRUTHS = [
  { text: "Fitness illenkil smoking-inekkaal danger aanu, machane. Ettavum unfit aaya aalkkarkku nerathe marikkaan 5 iratti chance.", source: "JAMA Network Open, 2018 (122,007 people)" },
  { text: "Sofa-yil kidakkunnavarkku 20-30% kooduthal maranam risk. Netflix ninne rakshikkilla.", source: "World Health Organization" },
  { text: "Divasam 30 min nadannaal erectile dysfunction risk 41% kurayum. Thaazhe ullavanum workout venam, bro.", source: "Harvard Health Professionals Follow-up Study" },
  { text: "Grip strength 5 kg kuranjaal maranam risk 16% koodum. Kai-kku balam illenkil aayussinum balam illa.", source: "The Lancet, PURE study, 2015 (139,691 people)" },
  { text: "Divasam 8 manikkoor irunnaal smoking-um obesity-um pole thanne risk. Oru manikkoor odiyaal theernu.", source: "The Lancet, 2016 (over 1 million people)" },
  { text: "Kurachu anangiyaal varshathil 50 lakh maranam ozhivaakkaam. Statistics-il ninte peru varanda.", source: "World Health Organization" },
  { text: "Depression-inu workout nalla marunnu aanu. Nadathavum jogging-um therapy-de athrem work aakum. Mood off aano? Odu.", source: "BMJ, 2024 (218 trials)" },
];

export const DRILLS = [
  "Air squats", "Walking lunges", "Incline push-ups", "Knee push-ups", "Mountain climbers",
  "Wall sit", "Dead hang", "Glute bridge", "Jump rope", "Side plank", "Step-ups",
  "Bear crawl", "High knees", "Superman hold",
];

/** Event-day titles. `pick` says who wins: most points overall, biggest jump from
    baseline, best score in one event, or best score in one category. */
export type AwardPick = { kind: "total" } | { kind: "leap" } | { kind: "event"; id: string } | { kind: "category"; id: CategoryId };
export const AWARDS: { title: string; text: string; pick: AwardPick }[] = [
  { title: "Winter Arc Champ", text: "Most points across all events.", pick: { kind: "total" } },
  { title: "Under Dog to Beast", text: "Biggest jump from your baseline.", pick: { kind: "leap" } },
  { title: "Speed King", text: "Fastest 100 m sprint.", pick: { kind: "event", id: "sprint" } },
  { title: "Last Man Standing", text: "Top score in plank and sit-ups.", pick: { kind: "category", id: "last-man" } },
  { title: "Enduro Monster", text: "Furthest on the timed long run.", pick: { kind: "event", id: "long-run" } },
];

/** Daily habits in the quick-log button. No points, just streaks. Add one with a single line.
    check: one tap for yes (or "no", which breaks the streak). rest: a second button that also keeps the streak going.
    claim: members can enter the streak they're already on, and it then counts up by itself until they slip.
    count: chips that add to today's total. training: a logged day (not a rest day) also keeps the main 🔥 practice streak alive.
    Every habit has its own Streaks board, separate from the event ranks. */
export type Habit = { id: string; name: string; icon: string } & (
  | { kind: "check"; yes: string; no?: string; rest?: string; claim?: boolean; training?: boolean }
  | { kind: "count"; steps: number[]; unit: string; training?: boolean }
);
export const HABITS: Habit[] = [
  { id: "nofap", name: "No-fap", icon: "🔒", kind: "check", yes: "Clean ✓", no: "Slipped", claim: true },
  { id: "nosmoke", name: "Beedi Break", icon: "🚭", kind: "check", yes: "Clean ✓", no: "Lit one", claim: true },
  { id: "running", name: "Running", icon: "🏃", kind: "check", yes: "Ran ✓", training: true },
  { id: "gym", name: "Gym", icon: "🏋️", kind: "check", yes: "Trained ✓", rest: "Rest day", no: "Skipped", claim: true, training: true },
];

export function nextMilestone(now = new Date()) {
  const list = [
    { label: "Baseline test", at: SEASON.baseline },
    { label: "Running weekend", at: SEASON.runningWeekend },
    { label: "Strength weekend", at: SEASON.strengthWeekend },
    { label: "Awards night", at: SEASON.awards },
  ];
  return list.find((m) => new Date(m.at).getTime() > now.getTime()) ?? list[list.length - 1];
}
