import type { Profile, Tone } from "./profile.ts";

// Builds arena trash talk from real stats and the personality questionnaire.
// The attacker's tone decides the style; the target's answers are the material.

export type Talker = {
  id: string; name: string; rank: number; total: number; streak: number;
  limit: string | null; best: string | null; catchphrase: string | null; profile: Profile;
};

type Line = (a: Talker, b: Talker) => string | null;

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// Material about the target (b), shared by every tone.
const ROASTS: Record<Tone, Line[]> = {
  Savage: [
    (a, b) => b.profile.excuse ? `"${b.profile.excuse}". Heard it, ${b.name}. Still not buying it.` : null,
    (a, b) => b.profile.weakness ? `Put down the ${lc(b.profile.weakness)}, ${b.name}. It's not a recovery meal.` : null,
    (a, b) => b.profile.alterEgo ? `"${b.profile.alterEgo}"? More like a house cat, ${b.name}.` : null,
    (a, b) => b.profile.song ? `Play ${b.profile.song} all you want, ${b.name}. Still slow.` : null,
    (a, b) => b.limit ? `${b.name}, your ${b.limit.toLowerCase()} needs a search party.` : null,
    (a, b) => a.rank < b.rank ? `Rank ${a.rank}. You're ${b.rank}. Stay down there, ${b.name}.` : null,
    (a, b) => a.streak > b.streak ? `${a.streak} days straight. ${b.name}'s on ${b.streak}. Catch up.` : null,
    (a, b) => `${b.name}, I've seen more effort from a warm-up.`,
    (a, b) => `${b.name}, the cold isn't your problem. Your pace is.`,
    (a, b) => `Stay humble, ${b.name}. You've got plenty to be humble about.`,
    (a, b) => `${b.name}, the leaderboard has a section for you. It's called "below".`,
  ],
  Playful: [
    (a, b) => b.profile.excuse ? `Let me guess, ${b.name}: "${b.profile.excuse}" again?` : null,
    (a, b) => b.profile.weakness ? `${b.name}, save me some ${lc(b.profile.weakness)} for after I win.` : null,
    (a, b) => b.profile.schedule === "Night owl" ? `Morning, ${b.name}! Oh wait, you're still asleep.` : null,
    (a, b) => b.profile.schedule === "Early bird" ? `${b.name} up at 5am and still behind me. Wild.` : null,
    (a, b) => b.profile.song ? `Is that ${b.profile.song} I hear, ${b.name}? Cute.` : null,
    (a, b) => b.limit ? `${b.name}, your ${b.limit.toLowerCase()} looks like a nap.` : null,
    (a, b) => a.total > b.total ? `${a.total} points to ${b.total}. Keep up, ${b.name}!` : null,
    (a, b) => `See you on running weekend, ${b.name}. Bring snacks, you'll be out there a while.`,
    (a, b) => `${b.name}, did you log today or just think about it?`,
    (a, b) => `Nice warm-up, ${b.name}. Oh, that was your workout?`,
    (a, b) => `${b.name}, my grandma does burpees faster. She's 80.`,
    (a, b) => `Don't worry ${b.name}, someone has to be last.`,
    (a, b) => `${b.name}, I'll wait for you at the finish. Bring a chair.`,
  ],
  "Dad jokes": [
    (a, b) => b.profile.weakness ? `${b.name}, I hear ${lc(b.profile.weakness)} is your favourite set. Of reps. To the fridge.` : null,
    (a, b) => b.profile.excuse ? `${b.name}'s excuse: "${b.profile.excuse}". Weak, like their planks.` : null,
    (a, b) => b.limit ? `Why did ${b.name} skip ${b.limit.toLowerCase()}? It was too much work-out.` : null,
    (a, b) => `${b.name}, you're like a broken pencil. Pointless in the 3 km.`,
    (a, b) => `I'd tell you a running joke, ${b.name}, but you wouldn't keep up.`,
    (a, b) => `${b.name}, your training plan is a lot like my jokes. Nobody follows it.`,
  ],
  "Cold and quiet": [
    (a, b) => b.profile.excuse ? `"${b.profile.excuse}." Noted.` : null,
    (a, b) => a.rank < b.rank ? `Rank ${a.rank}. That's all.` : null,
    (a, b) => `Tick tock, ${b.name}.`,
    (a, b) => `...`,
    (a, b) => b.limit ? `${b.limit}. I know, ${b.name}.` : null,
  ],
};

// Friendly roasts built from the target's honest answers. Used by every tone.
const PERSONAL_ROASTS: Line[] = [
  (a, b) => b.profile.trainingSince === "Not started yet" ? `${b.name} hasn't even started training and already showed up to talk. Respect, honestly.` : null,
  (a, b) => b.profile.trainingSince === "Under 6 months" ? `Under 6 months of training, ${b.name}? I've had socks longer than that.` : null,
  (a, b) => b.profile.trainingSince === "6 to 12 months" ? `A whole year of training, ${b.name}, and you still warm up like it's day one.` : null,
  (a, b) => b.profile.trainingSince === "1 to 3 years" ? `Years of training, ${b.name}. Where's it hiding?` : null,
  (a, b) => b.profile.trainingSince === "3+ years" ? `3+ years in, ${b.name}. The veteran. Slowest veteran I know.` : null,
  (a, b) => b.profile.toughest ? `${b.name}'s toughest challenge ever: "${b.profile.toughest}". Wait till running weekend.` : null,
  (a, b) => b.profile.goal ? `${b.name} wants to "${lc(b.profile.goal)}". Bold. I'll be watching.` : null,
  (a, b) => b.profile.fail ? `We all remember, ${b.name}: "${b.profile.fail}". Never forget.` : null,
  (a, b) => b.profile.bestRun !== undefined && b.profile.bestRun < 10 ? `${b.name}'s longest run ever is ${b.profile.bestRun} km. The long run is 10. Do the maths.` : null,
  (a, b) => b.profile.bestRun !== undefined && b.profile.bestRun >= 10 ? `${b.profile.bestRun} km once, ${b.name}? Prove it on running weekend.` : null,
  (a, b) => b.profile.maxPushups !== undefined && b.profile.maxPushups < 50 ? `${b.profile.maxPushups} push-ups max, ${b.name}? That's my warm-up.` : null,
  (a, b) => b.profile.maxPushups !== undefined && a.profile.maxPushups !== undefined && a.profile.maxPushups > b.profile.maxPushups ? `${a.profile.maxPushups} push-ups beats ${b.profile.maxPushups}, ${b.name}.` : null,
];

// Bragging from the attacker's own answers.
const BRAGS: Line[] = [
  (a) => a.profile.move ? `${a.profile.move}. That's the difference.` : null,
  (a) => a.profile.alterEgo ? `They call me ${a.profile.alterEgo}. Remember it.` : null,
  (a) => a.profile.song ? `${a.profile.song} just came on. Run.` : null,
  (a) => a.best ? `My ${a.best.toLowerCase()} has its own fan club.` : null,
  (a) => a.catchphrase,
];

const COMEBACKS: Line[] = [
  () => "That tickled.",
  (b, a) => `Rematch on strength weekend, ${a.name}.`,
  (b, a) => b.rank < a.rank ? `Big words from rank ${a.rank}.` : null,
  (b, a) => a.profile.weakness ? `Says the ${lc(a.profile.weakness)} addict.` : null,
  (b, a) => a.profile.excuse ? `Go on, ${a.name}. Tell them "${a.profile.excuse}".` : null,
  (b) => b.catchphrase,
  (b) => b.profile.move ? `${b.profile.move}. Watch and learn.` : null,
  (b) => b.profile.toughest ? `I survived "${lc(b.profile.toughest)}". You don't scare me.` : null,
  (b) => b.profile.goal ? `I'm here to ${lc(b.profile.goal)}. Move.` : null,
  (b, a) => a.profile.fail ? `Says the one who "${lc(a.profile.fail)}".` : null,
  () => "Talk is cheap. Training isn't.",
];

function choose(lines: Line[], a: Talker, b: Talker, rnd: () => number) {
  const ok = lines.map((l) => l(a, b)).filter((x): x is string => !!x);
  return ok.length ? ok[Math.floor(rnd() * ok.length)] : null;
}

export function trashTalk(a: Talker, b: Talker, rnd: () => number = Math.random): string {
  const tone = a.profile.tone ?? "Playful";
  const r = rnd();
  if (r < 0.2) { const brag = choose(BRAGS, a, b, rnd); if (brag) return brag; }
  if (r < 0.65) { const personal = choose(PERSONAL_ROASTS, a, b, rnd); if (personal) return personal; }
  return choose(ROASTS[tone], a, b, rnd) ?? choose(ROASTS.Playful, a, b, rnd)!;
}

export function comeback(b: Talker, a: Talker, rnd: () => number = Math.random): string {
  return choose(COMEBACKS, b, a, rnd) ?? "That tickled.";
}

/** Half the time people go after the rival they named. */
export function pickTarget<T extends { id: string }>(a: Talker, pool: T[], rnd: () => number = Math.random): T | undefined {
  const rival = a.profile.rivalId ? pool.find((p) => p.id === a.profile.rivalId) : undefined;
  if (rival && rnd() < 0.5) return rival;
  return pool[Math.floor(rnd() * pool.length)];
}
