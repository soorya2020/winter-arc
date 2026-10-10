import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { currentParticipant, isAdmin } from "@/lib/auth";
import { loadBoard } from "@/lib/board";
import { EVENTS, SEASON } from "@/lib/season.ts";
import { palette } from "@/lib/theme";

export const dynamic = "force-dynamic";

let anton: Promise<Buffer> | null = null;
const font = () => (anton ??= readFile(join(process.cwd(), "assets/Anton-Regular.ttf")));

const C = { bg: palette.paper, card: palette.track, ink: palette.ink, muted: palette.muted, pink: palette.accent, yellow: palette.accent, cyan: palette.ink };

// 1080 × 1350 portrait poster for Instagram and the group chat.
// /api/poster/<participant id> is one athlete; /api/poster/board is the whole leaderboard.
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const me = await currentParticipant();
  if (!isAdmin() && !me?.accepted_at) return NextResponse.json({ error: "Invite only" }, { status: 401 });
  const rows = await loadBoard();
  const fonts = [{ name: "Anton", data: await font(), weight: 400 as const, style: "normal" as const }];
  const headers = { "Content-Disposition": `inline; filename="winter-arc-${params.id === "board" ? "leaderboard" : "poster"}.png"` };

  if (params.id === "board") {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.ink, padding: 72 }}>
          <div style={{ display: "flex", fontSize: 28, color: C.cyan, letterSpacing: 6 }}>{SEASON.name.toUpperCase()} · LEADERBOARD</div>
          <div style={{ display: "flex", fontSize: 150, fontFamily: "Anton", color: C.pink, lineHeight: 1, marginTop: 20 }}>THE BOARD</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 48, gap: 18 }}>
            {rows.slice(0, 8).map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 24, padding: "22px 32px" }}>
                <div style={{ display: "flex", width: 90, fontSize: 64, fontFamily: "Anton", color: r.rank === 1 ? C.pink : C.ink }}>{r.rank}</div>
                <div style={{ display: "flex", flex: 1, fontSize: 44, fontWeight: 700 }}>{r.name}</div>
                <div style={{ display: "flex", fontSize: 64, fontFamily: "Anton", color: C.yellow }}>{r.total}</div>
              </div>
            ))}
          </div>
        </div>
      ),
      { width: 1080, height: 1350, headers, fonts },
    );
  }

  const r = rows.find((x) => x.id === params.id);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: C.bg, color: C.ink, padding: 72 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: C.cyan, letterSpacing: 6 }}>
          <span>{SEASON.name.toUpperCase()}</span><span>RANK #{r.rank}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 36, color: C.muted }}>I FOUND MY LIMIT</div>
          <div style={{ display: "flex", fontSize: 170, fontFamily: "Anton", lineHeight: 1, color: C.ink, marginTop: 12 }}>{r.name.toUpperCase()}</div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 24 }}>
            <span style={{ fontSize: 260, fontFamily: "Anton", color: C.yellow, lineHeight: 1 }}>{r.total}</span>
            <span style={{ fontSize: 48, color: C.muted, marginLeft: 20 }}>/ {EVENTS.length * 100} pts</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {EVENTS.map((e, i) => {
            const p = r.perEvent[e.id] ?? 0;
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ display: "flex", width: 280, fontSize: 30, color: C.muted }}>{e.name}</div>
                <div style={{ display: "flex", flex: 1, height: 22, background: C.card }}>
                  <div style={{ display: "flex", width: `${p}%`, height: 22, background: i < 3 ? C.pink : C.ink }} />
                </div>
                <div style={{ display: "flex", width: 80, justifyContent: "flex-end", fontSize: 32, fontWeight: 700 }}>{Math.round(p)}</div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers, fonts },
  );
}
