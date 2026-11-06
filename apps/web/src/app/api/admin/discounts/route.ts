import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function GET() {
  try {
    const discounts = await appointmentService.getPendingDiscounts();
    return NextResponse.json({
      success: true,
      count: discounts.length,
      discounts,
    });
  } catch (error: any) {
    console.error("Fetch pending discounts error:", error);
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

