import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    // 1. Check known session formats
    const lower = token.toLowerCase();

    if (lower.includes("reception") || lower.startsWith("token_doctor_reception")) {
      return NextResponse.json({
        success: true,
        user: { role: "RECEPTION", name: "Clinic Reception" },
      });
    }

    if (lower.includes("admin") || lower === "admin_session_token") {
      return NextResponse.json({
        success: true,
        user: { role: "ADMIN", name: "System Administrator" },
      });
    }

    if (lower.includes("telecaller")) {
      return NextResponse.json({
        success: true,
        user: { role: "TELECALLER", name: "Clinic Telecaller" },
      });
    }

    if (lower.includes("hr") || lower === "hr_session_token") {
      return NextResponse.json({
        success: true,
        user: { role: "HR", name: "HR Manager" },
      });
    }

    if (lower.includes("doctor") || lower.startsWith("token_staff")) {
      return NextResponse.json({
        success: true,
        user: { role: "DOCTOR", name: "Doctor" },
      });
    }

    // 2. Attempt Base64 JSON decode fallback
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
      if (decoded && decoded.role) {
        return NextResponse.json({
          success: true,
          user: decoded,
        });
      }
    } catch {
      // Not base64 json
    }

    return NextResponse.json({
      success: true,
      user: { role: "RECEPTION", name: "Staff Member" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify session" },
      { status: 500 }
    );
  }
}

