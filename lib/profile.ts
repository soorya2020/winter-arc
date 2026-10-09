// The personality questionnaire. Answers make arena trash talk personal:
// your own answers flavour what you say, and other people use them against you.

export const TONES = ["Savage", "Playful", "Dad jokes", "Cold and quiet"] as const;
export type Tone = (typeof TONES)[number];

export type Profile = {
  tone?: Tone;
  excuse?: string;   // "My go-to excuse for skipping a workout"
  weakness?: string; // "The snack or habit you can't quit"
  song?: string;     // "Your hype song"
  alterEgo?: string; // "Your fighter name or spirit animal"
  move?: string;     // "Your signature move or proudest stat"
  schedule?: "Early bird" | "Night owl";
  rivalId?: string;  // "Who are you coming for?"
};

export const QUESTIONS: { key: Exclude<keyof Profile, "tone" | "schedule" | "rivalId">; label: string; placeholder: string }[] = [
  { key: "alterEgo", label: "Your fighter name or spirit animal", placeholder: "The Kerala Cheetah" },
  { key: "move", label: "Your signature move", placeholder: "Never skipping leg day" },
  { key: "excuse", label: "Your go-to excuse for skipping a workout", placeholder: "It looked like rain" },
  { key: "weakness", label: "The snack or habit you can't quit", placeholder: "Midnight biryani" },
  { key: "song", label: "Your hype song", placeholder: "Eye of the Tiger" },
];

const clip = (v: unknown, n = 60) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

/** Reads the questionnaire out of a submitted form, keeping only known, short answers. */
export function profileFromForm(form: FormData): Profile {
  const p: Profile = {};
  const tone = clip(form.get("tone"));
  if ((TONES as readonly string[]).includes(tone)) p.tone = tone as Tone;
  const schedule = clip(form.get("schedule"));
  if (schedule === "Early bird" || schedule === "Night owl") p.schedule = schedule;
  const rival = clip(form.get("rivalId"), 40);
  if (/^[0-9a-f-]{36}$/.test(rival)) p.rivalId = rival;
  for (const q of QUESTIONS) { const v = clip(form.get(q.key)); if (v) p[q.key] = v; }
  return p;
}
