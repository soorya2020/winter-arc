import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { participantByToken } from "./db";

export const PARTICIPANT_COOKIE = "wa_invite";
const ADMIN_COOKIE = "wa_admin";
const YEAR = 60 * 60 * 24 * 365;

export const newToken = () => randomBytes(18).toString("base64url");

export function currentParticipant() {
  return participantByToken(cookies().get(PARTICIPANT_COOKIE)?.value);
}

export function participantCookie(token: string) {
  return { name: PARTICIPANT_COOKIE, value: token, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR };
}

function adminSignature() {
  const secret = process.env.SESSION_SECRET;
  const pw = process.env.ADMIN_PASSWORD;
  if (!secret || !pw) return null;
  return createHmac("sha256", secret).update(`admin:${pw}`).digest("base64url");
}

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isAdmin() {
  const sig = adminSignature();
  const got = cookies().get(ADMIN_COOKIE)?.value;
  return !!sig && !!got && same(sig, got);
}

export function adminLogin(password: string) {
  const pw = process.env.ADMIN_PASSWORD;
  const sig = adminSignature();
  if (!pw || !sig || !same(password, pw)) return false;
  cookies().set({ name: ADMIN_COOKIE, value: sig, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return true;
}

export function adminLogout() {
  cookies().delete(ADMIN_COOKIE);
}

export function requireAdmin() {
  if (!isAdmin()) throw new Error("Admin login required");
}
