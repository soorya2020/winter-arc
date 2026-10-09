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
    (a, b) => b.profile.excuse ? `"${b.profile.excuse}". Heard it, ${b.name}. Still pathetic.` : null,
    (a, b) => b.profile.weakness ? `Put down the ${lc(b.profile.weakness)}, ${b.name}. It's not a recovery meal.` : null,
    (a, b) => b.profile.alterEgo ? `"${b.profile.alterEgo}"? More like a house cat, ${b.name}.` : null,
    (a, b) => b.profile.song ? `Play ${b.profile.song} all you want, ${b.name}. Still slow.` : null,
    (a, b) => b.limit ? `${b.name}, your ${b.limit.toLowerCase()} is a crime scene.` : null,
    (a, b) => a.rank < b.rank ? `Rank ${a.rank}. You're ${b.rank}. Stay down there, ${b.name}.` : null,
    (a, b) => a.streak > b.streak ? `${a.streak} days straight. ${b.name}'s on ${b.streak}. Embarrassing.` : null,
    (a, b) => `${b.name}, I've seen more effort from a warm-up.`,
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
  () => "Talk is cheap. Training isn't.",
];

function choose(lines: Line[], a: Talker, b: Talker, rnd: () => number) {
  const ok = lines.map((l) => l(a, b)).filter((x): x is string => !!x);
  return ok.length ? ok[Math.floor(rnd() * ok.length)] : null;
}

export function trashTalk(a: Talker, b: Talker, rnd: () => number = Math.random): string {
  const tone = a.profile.tone ?? "Playful";
  if (rnd() < 0.3) { const brag = choose(BRAGS, a, b, rnd); if (brag) return brag; }
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
