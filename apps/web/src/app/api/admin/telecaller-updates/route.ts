import { NextRequest, NextResponse } from "next/server";
import { telecallerCallLogService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const branch = searchParams.get("branch") || undefined;
    const outcome = searchParams.get("outcome") || undefined;
    const telecallerId = searchParams.get("telecallerId") || undefined;

    const logs = await telecallerCallLogService.getAllLogs({
      search,
      branch,
      outcome,
      telecallerId,
    });
    const stats = await telecallerCallLogService.getStats();

    return NextResponse.json({
      success: true,
      logs,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch updates" },
      { status: 500 }
    );
  }
}

