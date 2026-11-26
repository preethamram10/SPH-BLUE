import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signTestJwt(payload, secret) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = base64UrlEncode(crypto.createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

function verifyTestJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = base64UrlEncode(crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest());
  if (Buffer.from(s).length !== Buffer.from(expected).length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  const padded = p.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(Buffer.from(padded + "=".repeat((4 - (padded.length % 4)) % 4), "base64").toString("utf-8"));
  if (decoded.exp && Date.now() > decoded.exp) return null;
  return decoded;
}

function sanitizeRecord(record) {
  if (!record || typeof record !== "object") return record;
  const { password: _pw, passwordHash: _pwh, ...safe } = record;
  return safe;
}

test("JWT signing verifies valid token and rejects tampered token", () => {
  const secret = "test-secret-key-for-sph";
  const token = signTestJwt({ userId: "u1", role: "DOCTOR", exp: Date.now() + 60000 }, secret);
  const decoded = verifyTestJwt(token, secret);
  assert.equal(decoded?.userId, "u1");
  assert.equal(decoded?.role, "DOCTOR");

  const [h, p, s] = token.split(".");
  const tamperedPayload = base64UrlEncode(JSON.stringify({ userId: "u1", role: "ADMIN", exp: Date.now() + 60000 }));
  assert.equal(verifyTestJwt(`${h}.${tamperedPayload}.${s}`, secret), null);
});

test("JWT verification rejects expired tokens", () => {
  const secret = "test-secret-key-for-sph";
  const expired = signTestJwt({ userId: "u1", role: "RECEPTION", exp: Date.now() - 1000 }, secret);
  assert.equal(verifyTestJwt(expired, secret), null);
});

test("sanitizeRecord strips password and passwordHash fields", () => {
  const clean = sanitizeRecord({
    id: "emp-1",
    name: "Srikanth",
    password: "secret",
    passwordHash: "hash123",
    role: "TELECALLER",
  });
  assert.equal(clean.id, "emp-1");
  assert.equal("password" in clean, false);
  assert.equal("passwordHash" in clean, false);
});
