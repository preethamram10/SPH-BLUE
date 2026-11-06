import { NextRequest, NextResponse } from "next/server";
import { branchTargetService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;
    const roleParam = (searchParams.get("role") || "ADMIN").toUpperCase();
    const role = roleParam === "HR" ? "HR" : "ADMIN";

    const data = await branchTargetService.getBranchTargets(month, role);
    const monthsList = branchTargetService.getHistoricalMonthsList(12);

    return NextResponse.json({
      success: true,
      ...data,
      monthsList,
    });
  } catch (error: any) {
    console.error("Fetch branch targets error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch branch targets." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branch, monthYear, targetAmount, role, userName } = body;

    if (!branch || !monthYear || targetAmount === undefined) {
      return NextResponse.json(
        { success: false, error: "Branch, month, and target amount are required." },
        { status: 400 }
      );
    }

    const effectiveRole = (role || "ADMIN").toUpperCase() === "HR" ? "HR" : "ADMIN";

    const result = await branchTargetService.setBranchTarget({
      branch,
      monthYear,
      targetAmount: Number(targetAmount),
      role: effectiveRole,
      userName,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Target for ${branch} updated successfully!`,
      target: result.target,
    });
  } catch (error: any) {
    console.error("Set branch target error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save branch target." },
      { status: 500 }
    );
  }
}

