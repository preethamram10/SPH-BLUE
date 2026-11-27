import fs from "fs";
import path from "path";
import { formatSmsDateDDMMYYYY, formatSmsMobile } from "@/lib/sms";

const WABA_BASE_URL = "https://partnersv1.pinbot.ai/v3";
const WABA_API_KEY = process.env.WABA_API_KEY || "2731e63f-a853-11f1-afb3-02c8a5e042bd";
const WABA_PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID || "1303340612865892";

export const WHATSAPP_TEMPLATES = {
  BOOKED_APT: "booked_apt",
  LOCATION_APT: "location_apt",
  RESCHEDULED: "appointment_rescheduled",
  CANCELLED: "appointment_cancelled",
  PAYMENT_RECEIPT: "payement_receipt",
  INVOICE_PDF: "invoice_pdf",
  EXP_LINK: "exp_link",
  GOOGLE_REVIEW: "googlee_review",
  THANK_DILSHUKNAGAR: "dilshuknagar",
  THANK_CHANDANAGAR: "chandanagar",
  THANK_KUKATPALLY: "kukatpally",
  THANK_NALLAGANDLA: "nallagandla",
} as const;

interface FeedbackContext {
  phone: string;
  patientName: string;
  branch: string;
  sentAt: string;
}

function getFeedbackStorePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "whatsapp_feedback_context.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (!fs.existsSync(rootCache)) {
    fs.mkdirSync(rootCache, { recursive: true });
  }
  return path.join(rootCache, "whatsapp_feedback_context.json");
}

function saveFeedbackContext(ctx: FeedbackContext): void {
  try {
    const file = getFeedbackStorePath();
    let list: FeedbackContext[] = [];
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(parsed)) list = parsed;
    }
    const clean10 = ctx.phone.replace(/\D/g, "").slice(-10);
    const filtered = list.filter((x) => x.phone !== clean10);
    filtered.unshift({ ...ctx, phone: clean10 });
    fs.writeFileSync(file, JSON.stringify(filtered.slice(0, 1000), null, 2), "utf8");
  } catch (e) {
    console.warn("[WhatsApp] Failed saving feedback context:", e);
  }
}

export function getFeedbackContext(rawPhone: string): FeedbackContext | null {
  try {
    const file = getFeedbackStorePath();
    if (!fs.existsSync(file)) return null;
    const list = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(list)) return null;
    const clean10 = String(rawPhone || "").replace(/\D/g, "").slice(-10);
    return list.find((x) => x.phone === clean10) || null;
  } catch {
    return null;
  }
}

function stripDrPrefix(doctorName?: string): string {
  return String(doctorName || "Consultant")
    .trim()
    .replace(/^dr\.?\s+/i, "")
    .trim();
}

function ensureDrPrefix(doctorName?: string): string {
  return `Dr. ${stripDrPrefix(doctorName)}`;
}

export function resolveBranchLocationShortUrl(branch?: string): string {
  const b = (branch || "").toLowerCase();
  if (b.includes("nallag")) return "https://stiny.in/SPHOMEO/nallag";
  if (b.includes("dilshuk") || b.includes("dilshu")) return "https://stiny.in/SPHOMEO/dilshuk";
  if (b.includes("chanda")) return "https://stiny.in/SPHOMEO/chanda";
  return "https://stiny.in/SPHOMEO/kphb";
}

export function resolveBranchGoogleReviewUrl(branch?: string): string {
  const b = (branch || "").toLowerCase();
  if (b.includes("dilshuk") || b.includes("dilshu")) {
    return "https://g.page/r/CU1YDEyXIcwhEBM/review";
  }
  if (b.includes("nallag")) {
    return "https://g.page/r/CUlOWoE7dEjoEBM/review";
  }
  if (b.includes("chanda")) {
    return "https://g.page/r/CairS0V3apxiEBM/review";
  }
  return "https://stiny.in/SPHOMEO/kphb";
}

export function resolveBranchThankYouTemplate(branch?: string): string {
  const b = (branch || "").toLowerCase();
  if (b.includes("dilshuk") || b.includes("dilshu")) return WHATSAPP_TEMPLATES.THANK_DILSHUKNAGAR;
  if (b.includes("chanda")) return WHATSAPP_TEMPLATES.THANK_CHANDANAGAR;
  if (b.includes("nallag")) return WHATSAPP_TEMPLATES.THANK_NALLAGANDLA;
  return WHATSAPP_TEMPLATES.THANK_KUKATPALLY;
}

async function sendWhatsAppTemplate(params: {
  mobile: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}): Promise<{ ok: boolean; skippedNoWhatsApp?: boolean; data?: any; error?: string }> {
  const to = formatSmsMobile(params.mobile);
  if (!to || to.length < 10) {
    return { ok: false, error: "Invalid recipient mobile number" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${WABA_BASE_URL}/${WABA_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: WABA_API_KEY,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: params.templateName,
          language: {
            code: params.languageCode || "en",
          },
          components: params.components || [],
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {}

    // Error 133010: Phone number is not registered with WhatsApp Business platform -> skip gracefully
    const errCode = parsed?.error?.code || parsed?.code;
    if (String(errCode) === "133010" || text.includes("133010")) {
      return { ok: false, skippedNoWhatsApp: true, data: parsed };
    }

    if (!res.ok) {
      console.warn(`[WhatsApp] ${params.templateName} failed (${res.status}):`, text);
      return { ok: false, data: parsed, error: text };
    }

    return { ok: true, data: parsed };
  } catch (err: any) {
    console.warn(`[WhatsApp] ${params.templateName} error:`, err?.message || err);
    return { ok: false, error: err?.message || "WhatsApp request failed" };
  }
}

function buildBodyParams(values: Array<string | number>) {
  return [
    {
      type: "body",
      parameters: values.map((v) => ({
        type: "text",
        text: String(v ?? ""),
      })),
    },
  ];
}

export async function uploadWhatsAppMediaPdf(pdfBuffer: Buffer, filename: string): Promise<string | null> {
  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
    formData.append("sheet", blob, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${WABA_BASE_URL}/${WABA_PHONE_NUMBER_ID}/media`, {
      method: "POST",
      headers: {
        apikey: WABA_API_KEY,
      },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    const mediaId = data?.response?.id || data?.id || null;
    if (!mediaId) {
      console.warn("[WhatsApp] Media upload did not return id:", data);
    }
    return mediaId;
  } catch (err: any) {
    console.warn("[WhatsApp] PDF upload error:", err?.message || err);
    return null;
  }
}

export async function sendWhatsAppAppointmentBooked(params: {
  mobile: string;
  patientName: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  branch: string;
}) {
  const dateDDMMYYYY = formatSmsDateDDMMYYYY(params.date);
  const docWithDr = ensureDrPrefix(params.doctorName);
  const locUrl = resolveBranchLocationShortUrl(params.branch);

  const bookedRes = await sendWhatsAppTemplate({
    mobile: params.mobile,
    templateName: WHATSAPP_TEMPLATES.BOOKED_APT,
    components: buildBodyParams([
      params.patientName,
      docWithDr,
      dateDDMMYYYY,
      params.timeSlot,
      params.branch,
      locUrl,
    ]),
  });

  if (bookedRes.skippedNoWhatsApp) return bookedRes;

  await sendWhatsAppTemplate({
    mobile: params.mobile,
    templateName: WHATSAPP_TEMPLATES.LOCATION_APT,
    components: buildBodyParams([
      params.patientName,
      docWithDr,
      dateDDMMYYYY,
      params.timeSlot,
      params.branch,
      locUrl,
    ]),
  });

  return bookedRes;
}

export async function sendWhatsAppAppointmentRescheduled(params: {
  mobile: string;
  patientName: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  branch: string;
}) {
  const dateDDMMYYYY = formatSmsDateDDMMYYYY(params.date);
  const docClean = stripDrPrefix(params.doctorName);
  return sendWhatsAppTemplate({
    mobile: params.mobile,
    templateName: WHATSAPP_TEMPLATES.RESCHEDULED,
    components: buildBodyParams([
      params.patientName,
      docClean,
      dateDDMMYYYY,
      params.timeSlot,
      params.branch,
    ]),
  });
}

export async function sendWhatsAppAppointmentCancelled(params: {
  mobile: string;
  patientName: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  branch: string;
}) {
  const dateDDMMYYYY = formatSmsDateDDMMYYYY(params.date);
  const docClean = stripDrPrefix(params.doctorName);
  return sendWhatsAppTemplate({
    mobile: params.mobile,
    templateName: WHATSAPP_TEMPLATES.CANCELLED,
    components: buildBodyParams([
      params.patientName,
      docClean,
      dateDDMMYYYY,
      params.timeSlot,
      params.branch,
    ]),
  });
}

export async function sendWhatsAppPaymentAndFeedbackFlow(params: {
  mobile: string;
  patientName: string;
  amount: number | string;
  receiptNo: string;
  date: string;
  branch: string;
  pdfBuffer?: Buffer;
}) {
  const dateDDMMYYYY = formatSmsDateDDMMYYYY(params.date);

  // 1. Payment Receipt
  const receiptRes = await sendWhatsAppTemplate({
    mobile: params.mobile,
    templateName: WHATSAPP_TEMPLATES.PAYMENT_RECEIPT,
    components: buildBodyParams([
      params.patientName,
      params.amount,
      params.receiptNo,
      dateDDMMYYYY,
      params.branch,
    ]),
  });

  if (receiptRes.skippedNoWhatsApp) return receiptRes;

  // 2. Direct Invoice PDF Attachment (using the generated invoice PDF)
  if (params.pdfBuffer && params.pdfBuffer.length > 0) {
    const filename = `${(params.receiptNo || "Invoice").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    const mediaId = await uploadWhatsAppMediaPdf(params.pdfBuffer, filename);
    if (mediaId) {
      await sendWhatsAppTemplate({
        mobile: params.mobile,
        templateName: WHATSAPP_TEMPLATES.INVOICE_PDF,
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: {
                  id: mediaId,
                  filename,
                },
              },
            ],
          },
          ...buildBodyParams([params.patientName]),
        ],
      });
    }
  }

  // 3. Experience Feedback Prompt (Good / Can be better / Bad)
  saveFeedbackContext({
    phone: params.mobile,
    patientName: params.patientName,
    branch: params.branch,
    sentAt: new Date().toISOString(),
  });

  await sendWhatsAppTemplate({
    mobile: params.mobile,
    templateName: WHATSAPP_TEMPLATES.EXP_LINK,
    components: buildBodyParams([params.patientName]),
  });

  return receiptRes;
}

export async function sendWhatsAppGoogleReview(params: {
  mobile: string;
  patientName: string;
  branch: string;
}) {
  const reviewUrl = resolveBranchGoogleReviewUrl(params.branch);
  return sendWhatsAppTemplate({
    mobile: params.mobile,
    templateName: WHATSAPP_TEMPLATES.GOOGLE_REVIEW,
    components: buildBodyParams([params.patientName, params.branch, reviewUrl]),
  });
}

export async function sendWhatsAppBranchThankYou(params: {
  mobile: string;
  patientName: string;
  branch: string;
}) {
  const templateName = resolveBranchThankYouTemplate(params.branch);
  return sendWhatsAppTemplate({
    mobile: params.mobile,
    templateName,
    components: buildBodyParams([params.patientName]),
  });
}
