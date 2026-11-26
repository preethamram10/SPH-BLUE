import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value || "";
    const token = bearerToken || cookieToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const verified = verifySessionToken(token);
    if (!verified) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired authentication token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: verified,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify session" },
      { status: 500 }
    );
  }
}
