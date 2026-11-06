import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, discountAmount, notes } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: "Appointment ID is required." },
        { status: 400 }
      );
    }

    const numDiscount = parseFloat(discountAmount) || 0;
    if (numDiscount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid discount amount is required." },
        { status: 400 }
      );
    }

    const updated = await appointmentService.requestMedicineDiscount(appointmentId, {
      discountAmount: numDiscount,
      notes: notes || "Discount requested by reception",
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Appointment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Discount request for ₹${numDiscount} submitted to HR & Admin for approval.`,
      appointment: updated,
    });
  } catch (error: any) {
    console.error("Discount request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit discount request." },
      { status: 500 }
    );
  }
}

