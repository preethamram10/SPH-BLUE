import crypto from "crypto";
import fs from "fs";
import path from "path";
import { sendEmail } from "@/lib/mailer";

export interface AdminHrAccount {
  id: string;
  role: "ADMIN" | "HR";
  name: string;
  email: string;
  passwordHash: string;
  updatedAt: string;
}

interface ResetCodeEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  cooldownUntil: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __sphAdminHrResetCodes: Map<string, ResetCodeEntry> | undefined;
}

const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes after 3 attempts

function getResetMap(): Map<string, ResetCodeEntry> {
  if (!global.__sphAdminHrResetCodes) {
    global.__sphAdminHrResetCodes = new Map<string, ResetCodeEntry>();
  }
  return global.__sphAdminHrResetCodes;
}

function getCredentialsFilePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "admin_hr_credentials.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (!fs.existsSync(rootCache)) {
    fs.mkdirSync(rootCache, { recursive: true });
  }
  return path.join(rootCache, "admin_hr_credentials.json");
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(plain: string, storedHash: string): boolean {
  const parts = String(storedHash || "").split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(plain, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, "hex");
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function getDefaultAccounts(): AdminHrAccount[] {
  const now = new Date().toISOString();
  return [
    {
      id: "admin-main",
      role: "ADMIN",
      name: "System Admin",
      email: "support@spiritualhomeo.com",
      passwordHash: hashPassword("Sph@176276"),
      updatedAt: now,
    },
    {
      id: "hr-main",
      role: "HR",
      name: "HR Operations",
      email: "appoinmentsspiritual@gmail.com",
      passwordHash: hashPassword("Hr@Sph"),
      updatedAt: now,
    },
  ];
}

function loadAccounts(): AdminHrAccount[] {
  const filePath = getCredentialsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed;
      }
    }
  } catch {}
  const defaults = getDefaultAccounts();
  saveAccounts(defaults);
  return defaults;
}

function saveAccounts(accounts: AdminHrAccount[]): void {
  const filePath = getCredentialsFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(accounts, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function verifyAdminHrCredentials(emailInput: string, passwordInput: string): AdminHrAccount | null {
  const cleanEmail = String(emailInput || "").trim().toLowerCase();
  const cleanPass = String(passwordInput || "");
  if (!cleanEmail || !cleanPass) return null;

  const accounts = loadAccounts();
  const matched = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (!matched) return null;

  if (!verifyPassword(cleanPass, matched.passwordHash)) {
    return null;
  }
  return matched;
}

export async function requestAdminHrPasswordReset(emailInput: string): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
}> {
  const cleanEmail = String(emailInput || "").trim().toLowerCase();
  const accounts = loadAccounts();
  const matched = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (!matched) {
    return { ok: false, error: "This email is not registered for Admin or HR access." };
  }

  const map = getResetMap();
  const now = Date.now();
  const existing = map.get(cleanEmail);

  if (existing && existing.cooldownUntil > now) {
    const secs = Math.ceil((existing.cooldownUntil - now) / 1000);
    return {
      ok: false,
      error: `Too many reset requests. Please wait ${Math.ceil(secs / 60)} minute(s) before trying again.`,
    };
  }

  const attempts = existing && existing.cooldownUntil <= now ? (existing.cooldownUntil > 0 ? 1 : existing.attempts + 1) : 1;
  const code = String(crypto.randomInt(100000, 1000000));
  const cooldownUntil = attempts >= 3 ? now + RESET_COOLDOWN_MS : 0;

  const mailRes = await sendEmail({
    to: matched.email,
    subject: `Spiritual Homeopathy ${matched.role} Password Reset Code`,
    text:
      `Hello ${matched.name},\n\n` +
      `Your 6-digit password reset verification code is: ${code}\n` +
      `This code is valid for 10 minutes. Do not share it with anyone.\n\n` +
      `Spiritual Homeopathy Clinics`,
  });

  if (!mailRes.ok) {
    return { ok: false, error: mailRes.error || "Failed to send reset email." };
  }

  map.set(cleanEmail, {
    code,
    expiresAt: now + RESET_CODE_TTL_MS,
    attempts,
    cooldownUntil,
  });

  return {
    ok: true,
    message: `A 6-digit password reset code has been sent to ${matched.email}.`,
  };
}

export function resetAdminHrPasswordWithCode(
  emailInput: string,
  codeInput: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const cleanEmail = String(emailInput || "").trim().toLowerCase();
  const cleanCode = String(codeInput || "").trim();
  const cleanNew = String(newPassword || "").trim();

  if (cleanNew.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters long." };
  }

  const map = getResetMap();
  const entry = map.get(cleanEmail);
  if (!entry || !entry.code) {
    return { ok: false, error: "No active reset code found. Please request a new code." };
  }
  if (Date.now() > entry.expiresAt) {
    return { ok: false, error: "Reset code has expired. Please request a new code." };
  }
  if (entry.code !== cleanCode) {
    return { ok: false, error: "Invalid verification code." };
  }

  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);
  if (idx === -1) {
    return { ok: false, error: "Account not found." };
  }

  accounts[idx] = {
    ...accounts[idx],
    passwordHash: hashPassword(cleanNew),
    updatedAt: new Date().toISOString(),
  };
  saveAccounts(accounts);

  map.set(cleanEmail, { ...entry, code: "", expiresAt: 0 });
  return { ok: true };
}

export function changeAdminHrPassword(
  emailInput: string,
  currentPassword: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const cleanEmail = String(emailInput || "").trim().toLowerCase();
  const cleanNew = String(newPassword || "").trim();

  if (cleanNew.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters long." };
  }

  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);
  if (idx === -1) {
    return { ok: false, error: "Account not found." };
  }

  if (!verifyPassword(currentPassword, accounts[idx].passwordHash)) {
    return { ok: false, error: "Current password is incorrect." };
  }

  accounts[idx] = {
    ...accounts[idx],
    passwordHash: hashPassword(cleanNew),
    updatedAt: new Date().toISOString(),
  };
  saveAccounts(accounts);

  return { ok: true };
}
