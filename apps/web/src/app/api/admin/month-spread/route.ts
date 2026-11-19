import { NextRequest, NextResponse } from "next/server";
import { planSpreadService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || "ALL";
    const cohort = searchParams.get("cohort") || undefined;
    const fromCohort = searchParams.get("from") || searchParams.get("fromCohort") || cohort;
    const toCohort = searchParams.get("to") || searchParams.get("toCohort") || cohort;
    const view = searchParams.get("view") === "calendar" ? "calendar" : "plan";

    const result = await planSpreadService.getMonthSpread({
      branch,
      cohort,
      fromCohort,
      toCohort,
      view,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/month-spread:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch month spread metrics" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "backfill";

    if (action === "reconcile") {
      const report = await planSpreadService.reconcile();
      return NextResponse.json({
        success: true,
        report,
      });
    }

    if (action === "refund") {
      if (!body.planId) {
        return NextResponse.json({ success: false, error: "planId is required" }, { status: 400 });
      }
      const ok = await planSpreadService.refundPlan(body.planId);
      return NextResponse.json({ success: ok });
    }

    const res = await planSpreadService.backfillFromExistingData({
      reset: body.reset === true,
    });

    return NextResponse.json({
      success: true,
      message: "Plan spread backfill completed successfully",
      stats: res,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/month-spread:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute backfill/reconcile" },
      { status: 500 }
    );
  }
}
