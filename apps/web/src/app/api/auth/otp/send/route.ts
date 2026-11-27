import { NextRequest, NextResponse } from "next/server";
import { issueOtpForPhone } from "@/lib/otpStore";
import { sendOtpSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = String(body?.phone || "").trim();

    const issued = issueOtpForPhone(phone);
    if (!issued.allowed || !issued.otp) {
      return NextResponse.json(
        {
          success: false,
          error: issued.error || "Unable to send OTP.",
          retryAfterSeconds: issued.retryAfterSeconds,
        },
        { status: issued.retryAfterSeconds ? 429 : 400 }
      );
    }

    const smsResult = await sendOtpSms(phone, issued.otp);
    if (!smsResult.ok) {
      console.warn("[OTP Send] SMS gateway response:", smsResult);
    }

    return NextResponse.json({
      success: true,
      message: "4-digit OTP sent to your registered mobile number.",
      expiresInSeconds: issued.expiresInSeconds,
      attemptsUsed: issued.attemptsUsed,
      maxAttempts: issued.maxAttempts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}
