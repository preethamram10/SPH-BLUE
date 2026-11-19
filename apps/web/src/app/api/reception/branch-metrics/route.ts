import { NextRequest, NextResponse } from "next/server";
import { revenueQualityService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const from = searchParams.get("from") || searchParams.get("fromMonth") || undefined;
    const to = searchParams.get("to") || searchParams.get("toMonth") || undefined;

    const metrics = await revenueQualityService.getBranchMetrics({
      branch,
      fromMonth: from,
      toMonth: to,
    });

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    console.error("Error in GET /api/reception/branch-metrics:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch branch revenue quality metrics" },
      { status: 500 }
    );
  }
}
