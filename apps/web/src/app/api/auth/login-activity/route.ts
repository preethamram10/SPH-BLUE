import { NextResponse } from "next/server";
import { loginActivityService } from "@spiritualhomeo/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get("role") || undefined;
    const platform = searchParams.get("platform") || undefined;
    const branchName = searchParams.get("branch") || undefined;
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const activities = await loginActivityService.getAllActivities({
      userRole,
      platform,
      branchName,
      date,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (err: any) {
    console.error("Error fetching login activities:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch login activities" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = (body.action || "LOGIN").toUpperCase();

    // Extract client IP and user-agent
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || body.deviceInfo || "Web Browser";

    if (action === "LOGOUT") {
      const record = await loginActivityService.recordLogout({
        sessionId: body.sessionId,
        userId: body.userId,
        userRole: body.userRole,
        phone: body.phone,
      });

      return NextResponse.json({
        success: true,
        action: "LOGOUT",
        record,
      });
    }

    // Default: LOGIN
    const record = await loginActivityService.recordLogin({
      userId: body.userId,
      userName: body.userName,
      userRole: body.userRole,
      phone: body.phone,
      branchName: body.branchName,
      platform: body.platform || "WEB",
      deviceInfo: userAgent,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      action: "LOGIN",
      sessionId: record.id,
      record,
    });
  } catch (err: any) {
    console.error("Error processing login activity:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process activity" },
      { status: 500 }
    );
  }
}
