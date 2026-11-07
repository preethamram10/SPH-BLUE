import { NextResponse } from "next/server";
import { staffDailyWorkService } from "@spiritualhomeo/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId") || undefined;
    const date = searchParams.get("date") || undefined;

    const reports = await staffDailyWorkService.getAllReports(staffId, date);
    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load daily work reports" }, { status: 500 });
  }
}

