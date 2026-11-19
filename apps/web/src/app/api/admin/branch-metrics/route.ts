import { NextRequest, NextResponse } from "next/server";
import { revenueQualityService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || "ALL";
    const from = searchParams.get("from") || searchParams.get("fromMonth") || undefined;
    const to = searchParams.get("to") || searchParams.get("toMonth") || undefined;

    if (branch === "ALL" || !branch) {
      const multi = await revenueQualityService.getMultiBranchMetrics({
        fromMonth: from,
        toMonth: to,
      });

      return NextResponse.json({
        success: true,
        data: multi.all,
        branches: multi.branches,
      });
    }

    const single = await revenueQualityService.getBranchMetrics({
      branch,
      fromMonth: from,
      toMonth: to,
    });

    return NextResponse.json({
      success: true,
      data: single,
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/branch-metrics:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch revenue quality metrics" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "backfill";

    if (action === "reconcile") {
      const report = await revenueQualityService.reconcile();
      return NextResponse.json({
        success: true,
        report,
      });
    }

    const res = await revenueQualityService.backfillFromExistingData({
      reset: body.reset === true,
    });

    return NextResponse.json({
      success: true,
      message: "Backfill completed successfully",
      stats: res,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/branch-metrics:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute backfill/reconcile" },
      { status: 500 }
    );
  }
}
