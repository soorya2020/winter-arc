import type { Profile, Tone } from "./profile.ts";

// Builds arena trash talk from real stats and the personality questionnaire.
// The attacker's tone decides the style; the target's answers are the material.

export type Talker = {
  id: string; name: string; rank: number; total: number; streak: number;
  limit: string | null; best: string | null; catchphrase: string | null; profile: Profile;
};

type Line = (a: Talker, b: Talker) => string | null;

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// Lines are in Manglish (Malayalam in English letters). Everyone is a guy, so it's
// machane / aliya / mone. Keep it friendly: roast the answer, never the person.

// Material about the target (b), shared by every tone.
const ROASTS: Record<Tone, Line[]> = {
  Savage: [
    (a, b) => b.profile.excuse ? `"${b.profile.excuse}" ennu. Ee excuse ivide chelavakilla, ${b.name}.` : null,
    (a, b) => b.profile.weakness ? `${b.profile.weakness} thazhe vekku, ${b.name}. Athu recovery meal alla machane.` : null,
    (a, b) => b.profile.alterEgo ? `"${b.profile.alterEgo}" aano? Veetile poocha polum ithilum fast aanu, ${b.name}.` : null,
    (a, b) => b.profile.song ? `${b.profile.song} ethra vattam ittalum, ${b.name}, speed illa scene illa.` : null,
    (a, b) => b.limit ? `${b.name}, ninte ${b.limit.toLowerCase()} kaananilla. Police-il complaint kodukkano?` : null,
    (a, b) => a.rank < b.rank ? `Njan rank ${a.rank}. Nee ${b.rank}. Avide thanne irunno, ${b.name}.` : null,
    (a, b) => a.streak > b.streak ? `${a.streak} divasam streak. ${b.name} ${b.streak}-il. Odi vaa aliya.` : null,
    (a, b) => `${b.name}, ninte workout kandaal warm-up aanennu thonnum.`,
    (a, b) => `${b.name}, thanuppu alla prashnam. Ninte pace aanu.`,
    (a, b) => `Leaderboard-il ninakku oru section undu, ${b.name}. Peru "thazhe".`,
  ],
  Playful: [
    (a, b) => b.profile.excuse ? `Parayatte, ${b.name}: "${b.profile.excuse}" thanne alle innum?` : null,
    (a, b) => b.profile.weakness ? `${b.name}, kurachu ${b.profile.weakness} enikkum maatti veku. Jayichittu kazhikkam.` : null,
    (a, b) => b.profile.schedule === "Night owl" ? `Good morning ${b.name}! Oh, ippozhum urakkam aanalle.` : null,
    (a, b) => b.profile.schedule === "Early bird" ? `Raavile 5 manikku eneettittum ${b.name} ente purakil. Kashtam.` : null,
    (a, b) => b.profile.song ? `${b.profile.song} aano kelkkunne, ${b.name}? Cute aanu.` : null,
    (a, b) => b.limit ? `${b.name}, ninte ${b.limit.toLowerCase()} kandaal oru uchamayakkam pole.` : null,
    (a, b) => a.total > b.total ? `${a.total} points vs ${b.total}. Pidichu kayaru, ${b.name}!` : null,
    (a, b) => `Running weekend-il kaanam, ${b.name}. Snacks eduthoo, kure neram venam ninakku.`,
    (a, b) => `${b.name}, innu log cheytho, atho chumma aalochichathe ullo?`,
    (a, b) => `Nalla warm-up, ${b.name}. Ayyo, athaayirunno ninte full workout?`,
    (a, b) => `${b.name}, ente ammoomma ithilum fast aayi burpee edukkum.`,
    (a, b) => `Pedikkanda ${b.name}, aarenkilum last aakanamallo.`,
    (a, b) => `Finish line-il njan wait cheyyam, ${b.name}. Oru kasera eduthoo.`,
  ],
  "Dad jokes": [
    (a, b) => b.profile.weakness ? `${b.name}-nte favourite set: fridge-ilekku ${b.profile.weakness} reps.` : null,
    (a, b) => b.profile.excuse ? `${b.name}-nte excuse: "${b.profile.excuse}". Ninte plank pole thanne, weak.` : null,
    (a, b) => b.limit ? `${b.name} enthinaa ${b.limit.toLowerCase()} skip cheythe? Bhayankara work-out aayirunnu.` : null,
    (a, b) => `${b.name}, nee odinja pencil pole aanu. 3 km-il oru point-um illa.`,
    (a, b) => `Oru running joke parayaam ${b.name}, pakshe nee catch cheyyilla.`,
    (a, b) => `${b.name}-nte training plan ente joke pole aanu. Aarum follow cheyyilla.`,
  ],
  "Cold and quiet": [
    (a, b) => b.profile.excuse ? `"${b.profile.excuse}." Sheri.` : null,
    (a, b) => a.rank < b.rank ? `Rank ${a.rank}. Athre ullu.` : null,
    (a, b) => `Samayam pokunnu, ${b.name}.`,
    (a, b) => `...`,
    (a, b) => b.limit ? `${b.limit}. Enikkariyaam, ${b.name}.` : null,
  ],
};

// Friendly roasts built from the target's honest answers. Used by every tone.
const PERSONAL_ROASTS: Line[] = [
  (a, b) => b.profile.trainingSince === "Not started yet" ? `${b.name} training thudangiyittu polum illa, ennittum dialogue-inu munnil. Respect, machane.` : null,
  (a, b) => b.profile.trainingSince === "Under 6 months" ? `Under 6 months training aano, ${b.name}? Ente socks-inu athilum praayam undu.` : null,
  (a, b) => b.profile.trainingSince === "6 to 12 months" ? `Oru kollam training, ${b.name}, ennittum warm-up ippozhum day one pole.` : null,
  (a, b) => b.profile.trainingSince === "1 to 3 years" ? `Varshangalaayi training aanennu, ${b.name}. Ellam evide olippichu vechekkunnu?` : null,
  (a, b) => b.profile.trainingSince === "3+ years" ? `3+ years aayi, ${b.name}. Senior aanu. Ettavum slow aaya senior.` : null,
  (a, b) => b.profile.toughest ? `${b.name}-nte toughest challenge: "${b.profile.toughest}". Running weekend varatte, kaanam.` : null,
  (a, b) => b.profile.goal ? `${b.name}-inu "${lc(b.profile.goal)}" venam polum. Kollaam aliya, njan nokki irikkunnu.` : null,
  (a, b) => b.profile.fail ? `Njangal marannittilla, ${b.name}: "${b.profile.fail}". Orikkalum marakkilla.` : null,
  (a, b) => b.profile.bestRun !== undefined && b.profile.bestRun < 10 ? `${b.name}, ninte longest run ${b.profile.bestRun} km aano? Long run 10 aanu, mone. Kanakku cheythu nokku.` : null,
  (a, b) => b.profile.bestRun !== undefined && b.profile.bestRun >= 10 ? `${b.profile.bestRun} km orikkal odi ennu, ${b.name}? Running weekend-il kaanikku.` : null,
  (a, b) => b.profile.maxPushups !== undefined && b.profile.maxPushups < 50 ? `${b.profile.maxPushups} push-ups aano max, ${b.name}? Ente warm-up athilum kooduthal aanu.` : null,
  (a, b) => b.profile.maxPushups !== undefined && a.profile.maxPushups !== undefined && a.profile.maxPushups > b.profile.maxPushups ? `${a.profile.maxPushups} push-ups vs ${b.profile.maxPushups}, ${b.name}. Kanakku simple aanu.` : null,
];

// Bragging from the attacker's own answers.
const BRAGS: Line[] = [
  (a) => a.profile.move ? `${a.profile.move}. Athaanu vyathyaasam.` : null,
  (a) => a.profile.alterEgo ? `Enne ${a.profile.alterEgo} ennu vilikkum. Orthu veccho.` : null,
  (a) => a.profile.song ? `${a.profile.song} play aayi. Odikko.` : null,
  (a) => a.best ? `Ente ${a.best.toLowerCase()}-nu swantham fan club undu.` : null,
  (a) => a.catchphrase,
];

const COMEBACKS: Line[] = [
  () => "Ikkiliyaakunnu, machane.",
  (b, a) => `Strength weekend-il rematch, ${a.name}.`,
  (b, a) => b.rank < a.rank ? `Rank ${a.rank}-il ninnu valiya dialogue.` : null,
  (b, a) => a.profile.weakness ? `${a.profile.weakness} addict aanu parayunnathu.` : null,
  (b, a) => a.profile.excuse ? `Parayu ${a.name}, "${a.profile.excuse}" ennu ellarodum parayu.` : null,
  (b) => b.catchphrase,
  (b) => b.profile.move ? `${b.profile.move}. Kandu padikku.` : null,
  (b) => b.profile.toughest ? `"${b.profile.toughest}" survive cheytha aala njan. Nee enne pedippikkan nokkenda.` : null,
  (b) => b.profile.goal ? `Ente lakshyam: "${lc(b.profile.goal)}". Vazhi maaru.` : null,
  (b, a) => a.profile.fail ? `"${a.profile.fail}" aaya aala aanu ee parayunnathu.` : null,
  () => "Samsaaram cheap aanu. Training alla.",
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
  return choose(COMEBACKS, b, a, rnd) ?? "Ikkiliyaakunnu, machane.";
}

/** Half the time people go after the rival they named. */
export function pickTarget<T extends { id: string }>(a: Talker, pool: T[], rnd: () => number = Math.random): T | undefined {
  const rival = a.profile.rivalId ? pool.find((p) => p.id === a.profile.rivalId) : undefined;
  if (rival && rnd() < 0.5) return rival;
  return pool[Math.floor(rnd() * pool.length)];
}
