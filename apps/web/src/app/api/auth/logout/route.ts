import { NextResponse } from "next/server";
import { loginActivityService } from "@spiritualhomeo/database";

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const record = await loginActivityService.recordLogout({
      sessionId: body.sessionId,
      userId: body.userId,
      userRole: body.userRole,
      phone: body.phone,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully logged out",
      record,
    });
  } catch (err: any) {
    console.error("Logout API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to logout" },
      { status: 500 }
    );
  }
}
