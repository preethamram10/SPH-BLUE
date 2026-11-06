import { NextRequest, NextResponse } from "next/server";
import { cleaningTaskService, toDDMMYYYY, getTodayDDMMYYYY } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchName = searchParams.get("branchName") || "";
    const date = searchParams.get("date") || getTodayDDMMYYYY();

    if (!branchName) {
      return NextResponse.json({
        lockout: false,
        task: null,
        message: "No branch specified.",
      });
    }

    const result = await cleaningTaskService.checkLockout(branchName, toDDMMYYYY(date));

    return NextResponse.json({
      success: true,
      lockout: result.lockout,
      task: result.task,
      message: result.message,
      today: getTodayDDMMYYYY(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, lockout: false, error: err.message || "Lockout check failed." },
      { status: 500 }
    );
  }
}

