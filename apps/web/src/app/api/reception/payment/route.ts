import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      appointmentId,
      consultationFee,
      medicineFee,
      dietPlanFee,
      totalAmountDue,
      paymentMethod,
      medicinesList,
      medicineDuration,
      discountApproved,
      discountNotes,
      discountStatus,
    } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: "Appointment ID is required." },
        { status: 400 }
      );
    }

    // Verify appointment exists
    const appt = await appointmentService.getAppointmentById(appointmentId);
    if (!appt) {
      return NextResponse.json(
        { success: false, error: "Appointment record not found." },
        { status: 404 }
      );
    }

    // Prescription validation: must have at least 1 prescription image
    const rxImages = appt.prescriptionImages || [];
    if (rxImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload Prescription to Collect Fee (Mandatory). Please upload or draw a prescription first.",
          requiresPrescription: true,
        },
        { status: 400 }
      );
    }

    const updated = await appointmentService.recordAppointmentPayment(appointmentId, {
      consultationFee: typeof consultationFee === "number" ? consultationFee : parseFloat(consultationFee) || 0,
      medicineFee: typeof medicineFee === "number" ? medicineFee : parseFloat(medicineFee) || 0,
      dietPlanFee: typeof dietPlanFee === "number" ? dietPlanFee : parseFloat(dietPlanFee) || 0,
      totalAmountDue: typeof totalAmountDue === "number" ? totalAmountDue : parseFloat(totalAmountDue) || 0,
      paymentMethod: paymentMethod || "CASH",
      medicinesList: Array.isArray(medicinesList) ? medicinesList : [],
      medicineDuration: medicineDuration || "1 Month",
      discountApproved: typeof discountApproved === "number" ? discountApproved : 0,
      discountNotes: discountNotes || "",
      discountStatus: discountStatus || (discountApproved ? "APPROVED" : "NONE"),
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to record payment." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${totalAmountDue} confirmed! Consultation completed.`,
      appointment: updated,
    });
  } catch (error: any) {
    console.error("Payment API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payment." },
      { status: 500 }
    );
  }
}

