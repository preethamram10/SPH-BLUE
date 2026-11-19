import { NextRequest, NextResponse } from "next/server";
import { planSpreadService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
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
    console.error("Error in GET /api/reception/month-spread:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch month spread metrics" },
      { status: 500 }
    );
  }
}
