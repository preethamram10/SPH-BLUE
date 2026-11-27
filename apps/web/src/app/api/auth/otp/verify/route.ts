import { NextRequest, NextResponse } from "next/server";
import { verifyOtpForPhone } from "@/lib/otpStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = String(body?.phone || "").trim();
    const otp = String(body?.otp || "").trim();

    const result = verifyOtpForPhone(phone, otp);
    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error || "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
