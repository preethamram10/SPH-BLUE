import { NextResponse } from "next/server";
import { staffAttendanceService } from "@spiritualhomeo/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const date = searchParams.get("date") || undefined;

    const records = await staffAttendanceService.getAllRecords(branch, date);
    return NextResponse.json({ success: true, records });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch attendance records" }, { status: 500 });
  }
}

