import crypto from "crypto";

export const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
export const OTP_MAX_ATTEMPTS_BEFORE_COOLDOWN = 3; // 3 sends/resends per day before cooldown
export const OTP_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooling period

interface OtpEntry {
  otp: string;
  expiresAt: number;
  dayKey: string;
  sendCount: number;
  cooldownUntil: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __sphOtpStore: Map<string, OtpEntry> | undefined;
}

function getStore(): Map<string, OtpEntry> {
  if (!global.__sphOtpStore) {
    global.__sphOtpStore = new Map<string, OtpEntry>();
  }
  return global.__sphOtpStore;
}

function getTodayISTKey(): string {
  const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return nowIst.toISOString().slice(0, 10);
}

export function normalizeOtpPhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function generateFourDigitOtp(): string {
  return String(crypto.randomInt(1000, 10000));
}

export function issueOtpForPhone(rawPhone: string): {
  allowed: boolean;
  otp?: string;
  expiresInSeconds?: number;
  attemptsUsed?: number;
  maxAttempts?: number;
  retryAfterSeconds?: number;
  error?: string;
} {
  const phone = normalizeOtpPhone(rawPhone);
  if (phone.length < 10) {
    return { allowed: false, error: "Valid 10-digit mobile number is required." };
  }

  const store = getStore();
  const now = Date.now();
  const today = getTodayISTKey();
  const existing = store.get(phone);

  let sendCount = 0;
  let cooldownUntil = 0;

  if (existing && existing.dayKey === today) {
    if (existing.cooldownUntil > now) {
      const retryAfterSeconds = Math.ceil((existing.cooldownUntil - now) / 1000);
      const mins = Math.floor(retryAfterSeconds / 60);
      const secs = retryAfterSeconds % 60;
      return {
        allowed: false,
        retryAfterSeconds,
        error: `OTP limit reached (3 attempts). Cooling period active — please try again in ${mins}m ${secs}s.`,
      };
    }

    // If previous cooldown already elapsed, reset burst counter
    if (existing.cooldownUntil > 0 && existing.cooldownUntil <= now) {
      sendCount = 0;
      cooldownUntil = 0;
    } else {
      sendCount = existing.sendCount;
    }
  }

  if (sendCount >= OTP_MAX_ATTEMPTS_BEFORE_COOLDOWN) {
    const newCooldown = now + OTP_COOLDOWN_MS;
    store.set(phone, {
      otp: existing?.otp || "",
      expiresAt: existing?.expiresAt || 0,
      dayKey: today,
      sendCount,
      cooldownUntil: newCooldown,
    });
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
      error: "Maximum 3 OTP requests reached. Please wait 5 minutes before requesting another OTP.",
    };
  }

  const otp = generateFourDigitOtp();
  const nextSendCount = sendCount + 1;
  // Once the 3rd attempt is used, arm the 5-minute cooldown for any subsequent request
  const nextCooldown = nextSendCount >= OTP_MAX_ATTEMPTS_BEFORE_COOLDOWN ? now + OTP_COOLDOWN_MS : 0;

  store.set(phone, {
    otp,
    expiresAt: now + OTP_EXPIRY_MS,
    dayKey: today,
    sendCount: nextSendCount,
    cooldownUntil: nextCooldown,
  });

  return {
    allowed: true,
    otp,
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    attemptsUsed: nextSendCount,
    maxAttempts: OTP_MAX_ATTEMPTS_BEFORE_COOLDOWN,
  };
}

export function verifyOtpForPhone(rawPhone: string, submittedOtp: string): {
  valid: boolean;
  error?: string;
} {
  const phone = normalizeOtpPhone(rawPhone);
  const code = String(submittedOtp || "").trim();
  if (!phone || !code) {
    return { valid: false, error: "Phone number and OTP are required." };
  }

  const store = getStore();
  const entry = store.get(phone);
  if (!entry || !entry.otp) {
    return { valid: false, error: "No active OTP found. Please request a new OTP." };
  }

  if (Date.now() > entry.expiresAt) {
    return { valid: false, error: "OTP has expired (valid for 2 minutes). Please request a new OTP." };
  }

  if (entry.otp !== code) {
    return { valid: false, error: "Invalid OTP. Please check the 4-digit code sent to your mobile." };
  }

  // Clear OTP once verified (preserve sendCount/cooldown tracking for the day)
  store.set(phone, {
    ...entry,
    otp: "",
    expiresAt: 0,
  });

  return { valid: true };
}
