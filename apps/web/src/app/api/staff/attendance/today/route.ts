import { NextResponse } from "next/server";
import { staffAttendanceService } from "@spiritualhomeo/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    const date = searchParams.get("date") || undefined;

    if (!staffId) {
      return NextResponse.json({ error: "staffId is required" }, { status: 400 });
    }

    const record = await staffAttendanceService.getTodayRecord(staffId, date);
    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch attendance" }, { status: 500 });
  }
}

