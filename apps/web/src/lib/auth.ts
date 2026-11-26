import crypto from "crypto";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "sph_session";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  userId: string;
  role: string;
  name?: string;
  branchId?: string;
  branchName?: string;
  isHeadDoctor?: boolean;
  doctorCategory?: string;
  identifier?: string;
  iat?: number;
  exp: number;
}

function getSigningSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  const seed = process.env.DATABASE_URL || "sph-blue-host-session-secret-fallback";
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLen), "base64").toString("utf-8");
}

/**
 * Create an HMAC-SHA256 signed JWT session token.
 */
export function signSessionToken(
  payload: Omit<SessionPayload, "iat" | "exp">,
  ttlMs: number = TOKEN_TTL_MS
): string {
  const now = Date.now();
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + ttlMs,
  };
  const headerPart = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadPart = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${headerPart}.${payloadPart}`;
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(data)
    .digest();
  return `${data}.${base64UrlEncode(sig)}`;
}

/**
 * Verify an HMAC-SHA256 signed JWT token and check expiration.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, sigPart] = parts;
  const data = `${headerPart}.${payloadPart}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac("sha256", getSigningSecret()).update(data).digest()
  );

  const sigBuf = Buffer.from(sigPart);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(payloadPart)) as SessionPayload;
    if (!decoded || !decoded.role) return null;
    if (decoded.exp && Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Strip sensitive password fields before serializing records to API clients.
 */
export function sanitizeRecord<T extends Record<string, any>>(record: T): Omit<T, "password" | "passwordHash"> {
  if (!record || typeof record !== "object") return record;
  const { password: _pw, passwordHash: _pwh, ...safe } = record;
  return safe;
}

export function sanitizeRecords<T extends Record<string, any>>(records: T[]): Array<Omit<T, "password" | "passwordHash">> {
  return Array.isArray(records) ? records.map(sanitizeRecord) : [];
}

/**
 * Attach an HttpOnly session cookie to a NextResponse.
 */
export function attachSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
    path: "/",
    maxAge: Math.floor(TOKEN_TTL_MS / 1000),
  });
  return res;
}

/**
 * Clear the HttpOnly session cookie on logout.
 */
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
