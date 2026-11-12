import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get("months") || "2", 10);
    const status = searchParams.get("status") || "ALL";
    const branch = searchParams.get("branch") || "ALL";

    const { discounts, stats } = await appointmentService.getDiscounts({
      months: isNaN(months) ? 2 : months,
      status,
      branch,
    });

    return NextResponse.json({
      success: true,
      count: discounts.length,
      discounts,
      stats,
    });
  } catch (error: any) {
    console.error("Fetch discounts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch discounts." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, action, approvedAmount, notes } = body;

    if (!appointmentId || !action) {
      return NextResponse.json(
        { success: false, error: "Appointment ID and action (ACCEPT / REJECT) are required." },
        { status: 400 }
      );
    }

    const updated = await appointmentService.respondMedicineDiscount(appointmentId, {
      action,
      approvedAmount: typeof approvedAmount === "number" ? approvedAmount : undefined,
      notes,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Appointment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Discount request ${action === "ACCEPT" ? "APPROVED" : "REJECTED"} successfully.`,
      appointment: updated,
    });
  } catch (error: any) {
    console.error("Respond discount error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update discount request." },
      { status: 500 }
    );
  }
}

