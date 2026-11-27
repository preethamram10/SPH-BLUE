import { NextRequest, NextResponse } from "next/server";
import { loginActivityService } from "@spiritualhomeo/database";
import {
  verifyAdminHrCredentials,
  requestAdminHrPasswordReset,
  resetAdminHrPasswordWithCode,
  changeAdminHrPassword,
} from "@/lib/adminHrAuth";
import { signSessionToken, attachSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || "LOGIN").toUpperCase();

    if (action === "FORGOT_PASSWORD") {
      const email = String(body?.email || "").trim();
      if (!email) {
        return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
      }
      const res = await requestAdminHrPasswordReset(email);
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: res.message });
    }

    if (action === "RESET_PASSWORD") {
      const email = String(body?.email || "").trim();
      const code = String(body?.code || "").trim();
      const newPassword = String(body?.newPassword || "");
      const res = resetAdminHrPasswordWithCode(email, code, newPassword);
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Password reset successfully! You can now sign in with your new password.",
      });
    }

    if (action === "CHANGE_PASSWORD") {
      const email = String(body?.email || "").trim();
      const currentPassword = String(body?.currentPassword || "");
      const newPassword = String(body?.newPassword || "");
      const res = changeAdminHrPassword(email, currentPassword, newPassword);
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Password changed successfully!",
      });
    }

    // Default: LOGIN
    const email = String(body?.email || body?.identifier || "").trim();
    const password = String(body?.password || "");
    const platform = body?.platform === "STAFF_APP" ? "STAFF_APP" : "WEB";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const account = verifyAdminHrCredentials(email, password);
    if (!account) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = signSessionToken({
      userId: account.id,
      role: account.role,
      name: account.name,
      identifier: account.email,
    });

    let sessionId = `log-${Date.now()}`;
    try {
      const act = await loginActivityService.recordLogin({
        userId: account.id,
        userName: account.name,
        userRole: account.role,
        phone: account.email,
        branchName: "All Branches",
        platform,
        deviceInfo: body?.deviceInfo || platform,
      });
      sessionId = act.id;
    } catch {}

    return attachSessionCookie(
      NextResponse.json({
        success: true,
        token,
        sessionId,
        user: {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role,
        },
      }),
      token
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
