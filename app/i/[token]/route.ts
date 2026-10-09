import { NextResponse, type NextRequest } from "next/server";
import { participantByToken } from "@/lib/db";
import { participantCookie } from "@/lib/auth";

// Invite links look like /i/<token>. Remember the invite and land on the page.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const me = await participantByToken(params.token);
  if (!me) return NextResponse.redirect(new URL("/?invite=invalid", req.url));
  const res = NextResponse.redirect(new URL(me.accepted_at ? "/board" : "/", req.url));
  res.cookies.set(participantCookie(me.token));
  return res;
}
