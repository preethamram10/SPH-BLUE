const SMS_API_BASE = "https://smslogin.co/v3/api.php";
const SMS_USERNAME = process.env.SMS_USERNAME || "SPHOMEO";
const SMS_API_KEY = process.env.SMS_API_KEY || "b93e415cf967f949dfff";
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || "SPHMEO";

export const SMS_TEMPLATE_IDS = {
  OTP: "1777178867791586062",
  BOOKED_BY_RECEPTION: "1777178462816194857",
  LOCATION_NALLAGANDLA: "1777178556817490414",
  LOCATION_DILSHUKNAGAR: "1777178556806095995",
  LOCATION_CHANDANAGAR: "1777178556794509958",
  LOCATION_KPHB: "1777178556826388827",
  PAYMENT_RECEIPT: "1777178462046760918",
  APPOINTMENT_CANCELLED: "1777178462662473689",
  APPOINTMENT_RESCHEDULED: "1777178462073032593",
} as const;

/**
 * Format a 10-digit Indian phone number with 91 country code for smslogin.co.
 */
export function formatSmsMobile(rawPhone: string): string {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length > 10) return `91${digits.slice(-10)}`;
  return digits;
}

/**
 * Normalize date string to DD-MM-YYYY for SMS templates.
 */
export function formatSmsDateDDMMYYYY(rawDate?: string): string {
  if (!rawDate) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  }
  const s = String(rawDate).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s.replace(/\//g, "-");
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
  }
  return s;
}

/**
 * Strip leading "Dr." / "Dr " so templates with "Dr. {#var#}" don't double-prefix.
 */
function stripDrPrefix(doctorName?: string): string {
  return String(doctorName || "Consultant")
    .trim()
    .replace(/^dr\.?\s+/i, "")
    .trim();
}

function ensureDrPrefix(doctorName?: string): string {
  const clean = stripDrPrefix(doctorName);
  return `Dr. ${clean}`;
}

export async function sendSms(params: {
  mobile: string;
  message: string;
  templateId: string;
}): Promise<{ ok: boolean; response?: string; error?: string }> {
  const formattedMobile = formatSmsMobile(params.mobile);
  if (!formattedMobile || formattedMobile.length < 10) {
    return { ok: false, error: "Invalid mobile number" };
  }

  try {
    const qs = new URLSearchParams({
      username: SMS_USERNAME,
      apikey: SMS_API_KEY,
      senderid: SMS_SENDER_ID,
      mobile: formattedMobile,
      message: params.message,
      templateid: params.templateId,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${SMS_API_BASE}?${qs.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    return { ok: res.ok, response: text };
  } catch (err: any) {
    console.warn("[SMS] Send failed:", err?.message || err);
    return { ok: false, error: err?.message || "SMS gateway error" };
  }
}

export async function sendOtpSms(mobile: string, otp: string) {
  const message = `Your OTP is ${otp}. It is valid for 5 minutes. Please do not share this OTP with anyone.\n\nSpiritual Homeopathy Clinics`;
  return sendSms({
    mobile,
    message,
    templateId: SMS_TEMPLATE_IDS.OTP,
  });
}

function resolveBranchLocationConfig(branch?: string): {
  templateId: string;
  shortUrl: string;
} | null {
  const b = (branch || "").toLowerCase();
  if (b.includes("nallag")) {
    return {
      templateId: SMS_TEMPLATE_IDS.LOCATION_NALLAGANDLA,
      shortUrl: "Visit:https://stiny.in/SPHMEO/nallag",
    };
  }
  if (b.includes("dilshuk") || b.includes("dilshu")) {
    return {
      templateId: SMS_TEMPLATE_IDS.LOCATION_DILSHUKNAGAR,
      shortUrl: "Visit:https://stiny.in/SPHMEO/dilshu",
    };
  }
  if (b.includes("chanda")) {
    return {
      templateId: SMS_TEMPLATE_IDS.LOCATION_CHANDANAGAR,
      shortUrl: "Visit:https://stiny.in/SPHMEO/chanda",
    };
  }
  if (b.includes("kphb") || b.includes("kukatpally")) {
    return {
      templateId: SMS_TEMPLATE_IDS.LOCATION_KPHB,
      shortUrl: "Visit: https://stiny.in/SPHMEO/kphb",
    };
  }
  return null;
}

export async function sendAppointmentBookedAndLocationSms(params: {
  mobile: string;
  patientName: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  branch: string;
}) {
  const formattedDate = formatSmsDateDDMMYYYY(params.date);
  const docClean = stripDrPrefix(params.doctorName);
  const docWithDr = ensureDrPrefix(params.doctorName);

  const bookedMessage =
    `Dear ${params.patientName}, your appointment has been booked successfully.\n` +
    `Doctor: Dr. ${docClean}\n` +
    `Date: ${formattedDate} | Time: ${params.timeSlot}\n` +
    `Branch: ${params.branch}\n` +
    `Website: www.spiritualhomeoclinic.com\n` +
    `Phone: 9069 176 176\n` +
    `Spiritual Homeopathy Clinics`;

  const bookedRes = await sendSms({
    mobile: params.mobile,
    message: bookedMessage,
    templateId: SMS_TEMPLATE_IDS.BOOKED_BY_RECEPTION,
  });

  const locConfig = resolveBranchLocationConfig(params.branch);
  if (locConfig) {
    const locationMessage =
      `Dear ${params.patientName}, your appointment with ${docWithDr} is confirmed.\n` +
      `Date: ${formattedDate} | Time: ${params.timeSlot}\n` +
      `Branch: ${params.branch}\n` +
      `Please arrive 10 minutes early.\n` +
      `Website: www.spiritualhomeoclinic.com\n` +
      `Phone: 9069 176 176\n` +
      `Spiritual Homeopathy Clinics\n` +
      `Need directions?\n` +
      `${locConfig.shortUrl}`;

    await sendSms({
      mobile: params.mobile,
      message: locationMessage,
      templateId: locConfig.templateId,
    });
  }

  return bookedRes;
}

export async function sendAppointmentRescheduledSms(params: {
  mobile: string;
  patientName: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  branch: string;
}) {
  const formattedDate = formatSmsDateDDMMYYYY(params.date);
  const docClean = stripDrPrefix(params.doctorName);
  const message =
    `Dear ${params.patientName},\n` +
    `Your appointment has been rescheduled.\n` +
    `Doctor: Dr. ${docClean}\n` +
    `Date: ${formattedDate} | Time: ${params.timeSlot}\n` +
    `Branch: ${params.branch}\n` +
    `Website: www.spiritualhomeoclinic.com`;

  return sendSms({
    mobile: params.mobile,
    message,
    templateId: SMS_TEMPLATE_IDS.APPOINTMENT_RESCHEDULED,
  });
}

export async function sendPaymentReceiptSms(params: {
  mobile: string;
  patientName: string;
  amount: number | string;
  receiptNo: string;
  date: string;
  branch: string;
}) {
  const formattedDate = formatSmsDateDDMMYYYY(params.date);
  const message =
    `Dear ${params.patientName},\n` +
    `We have received your payment of Rs.${params.amount}.\n` +
    `Receipt No: ${params.receiptNo}\n` +
    `Date: ${formattedDate}\n` +
    `Branch: ${params.branch}\n` +
    `Thank you for choosing Spiritual Homeopathy Clinics.\n` +
    `Website: www.spiritualhomeoclinic.com`;

  return sendSms({
    mobile: params.mobile,
    message,
    templateId: SMS_TEMPLATE_IDS.PAYMENT_RECEIPT,
  });
}

export async function sendAppointmentCancelledSms(params: {
  mobile: string;
  patientName: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  branch: string;
}) {
  const formattedDate = formatSmsDateDDMMYYYY(params.date);
  const docClean = stripDrPrefix(params.doctorName);
  const message =
    `Dear ${params.patientName},\n` +
    `Your appointment with Dr. ${docClean} on ${formattedDate} at ${params.timeSlot} has been cancelled.\n` +
    `To book a new appointment, please contact us.\n` +
    `Branch: ${params.branch}\n` +
    `Phone: 9069 176 176\n` +
    `Website: www.spiritualhomeoclinic.com`;

  return sendSms({
    mobile: params.mobile,
    message,
    templateId: SMS_TEMPLATE_IDS.APPOINTMENT_CANCELLED,
  });
}
