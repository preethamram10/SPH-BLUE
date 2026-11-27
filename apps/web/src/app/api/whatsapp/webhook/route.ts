import { NextRequest, NextResponse } from "next/server";
import { appointmentService, patientService } from "@spiritualhomeo/database";
import {
  getFeedbackContext,
  sendWhatsAppBranchThankYou,
  sendWhatsAppGoogleReview,
} from "@/lib/whatsapp";

/**
 * Webhook verification endpoint (if Meta/Pinbot verifies with hub.challenge).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get("hub.challenge");
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: "ok", webhook: "whatsapp" });
}

/**
 * Receives incoming WhatsApp quick-reply/text events from Pinbot/Leonas WABA.
 * - "Good" -> sends `googlee_review` with branch-specific Google Review URL
 * - "Can be better" / "Bad" -> sends branch-specific thank-you template
 * - Anything else (including "STOP") -> no reply sent
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const value = body?.entry?.[0]?.changes?.[0]?.value || body?.value || body;
    const messages = Array.isArray(value?.messages) ? value.messages : [];
    if (messages.length === 0) {
      return NextResponse.json({ success: true, ignored: true });
    }

    for (const msg of messages) {
      const fromPhone = String(msg?.from || "").trim();
      const rawReply = String(
        msg?.button?.text ||
          msg?.button?.payload ||
          msg?.interactive?.button_reply?.title ||
          msg?.interactive?.button_reply?.id ||
          msg?.text?.body ||
          ""
      )
        .trim()
        .toLowerCase();

      if (!fromPhone || !rawReply || rawReply === "stop") {
        continue;
      }

      const isGood = rawReply === "good";
      const isOtherFeedback =
        rawReply === "can be better" ||
        rawReply === "bad" ||
        rawReply.includes("can be better");

      if (!isGood && !isOtherFeedback) {
        continue;
      }

      // Resolve patient name and branch from feedback context or recent records
      let patientName = "Patient";
      let branch = "Kphb Branch";

      const ctx = getFeedbackContext(fromPhone);
      if (ctx) {
        patientName = ctx.patientName || patientName;
        branch = ctx.branch || branch;
      } else {
        const clean10 = fromPhone.replace(/\D/g, "").slice(-10);
        try {
          const profiles = await patientService.getProfilesByPhone(clean10);
          if (profiles.length > 0) {
            patientName = profiles[0].name || patientName;
            branch = profiles[0].branch || branch;
          } else {
            const appts = await appointmentService.getAppointments(undefined, undefined, undefined, false, false);
            const matched = appts.find((a) => String(a.phone || "").replace(/\D/g, "").slice(-10) === clean10);
            if (matched) {
              patientName = matched.patientName || patientName;
              branch = matched.branch || branch;
            }
          }
        } catch {}
      }

      if (isGood) {
        await sendWhatsAppGoogleReview({
          mobile: fromPhone,
          patientName,
          branch,
        });
      } else if (isOtherFeedback) {
        await sendWhatsAppBranchThankYou({
          mobile: fromPhone,
          patientName,
          branch,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.warn("[WhatsApp Webhook] Error:", err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || "Webhook error" }, { status: 200 });
  }
}
