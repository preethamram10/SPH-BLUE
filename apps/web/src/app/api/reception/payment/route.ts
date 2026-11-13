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
      dietFee,
      otherCharges,
      totalAmountDue,
      paymentMethod,
      paymentMode,
      medicinesList,
      medicines,
      medicineDuration,
      discountApproved,
      discount,
      discountReason,
      discountNotes,
      discountStatus,
      totalPaid,
      invoiceId,
      hasPackage,
      packageInstallmentPaid,
      isRegularBilling,
      skipPackagePayment,
      splitDetails,
      payLaterAmount,
      previousDuePaid,
      dueDate,
      payLaterNotes,
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

    // Prescription validation: must have at least 1 prescription image unless already completed or clinical details are present
    const rxImages = appt.prescriptionImages || [];
    const isExempt =
      Boolean((appt as any).hasPackage) ||
      Boolean((appt as any).activePackage) ||
      Boolean(hasPackage) ||
      Boolean(isRegularBilling) ||
      Boolean(appt.isSentToReception) ||
      Boolean(appt.diagnosisNotes) ||
      (Array.isArray(medicinesList) && medicinesList.length > 0) ||
      (Array.isArray(medicines) && medicines.length > 0);

    if (rxImages.length === 0 && !appt.isFeeCollected && appt.status !== "COMPLETED" && !isExempt) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload Prescription to Collect Fee (Mandatory). Please upload or draw a prescription first.",
          requiresPrescription: true,
        },
        { status: 400 }
      );
    }

    const effectiveMedicines = Array.isArray(medicinesList) && medicinesList.length > 0
      ? medicinesList
      : Array.isArray(medicines)
      ? medicines
      : [];

    const effectiveDietFee = typeof dietPlanFee === "number"
      ? dietPlanFee
      : typeof dietFee === "number"
      ? dietFee
      : parseFloat(dietFee || dietPlanFee) || 0;

    const effectiveDiscount = typeof discountApproved === "number" && discountApproved > 0
      ? discountApproved
      : typeof discount === "number"
      ? discount
      : parseFloat(discount) || 0;

    const finalMethod = (paymentMethod || paymentMode || "Counter UPI") as any;

    const updated = await appointmentService.recordAppointmentPayment(appointmentId, {
      consultationFee: typeof consultationFee === "number" ? consultationFee : parseFloat(consultationFee) || 0,
      medicineFee: typeof medicineFee === "number" ? medicineFee : parseFloat(medicineFee) || 0,
      dietPlanFee: effectiveDietFee,
      otherCharges: typeof otherCharges === "number" ? otherCharges : parseFloat(otherCharges) || 0,
      totalAmountDue: typeof totalAmountDue === "number" ? totalAmountDue : parseFloat(totalAmountDue) || 0,
      paymentMethod: finalMethod,
      paymentMode: finalMethod,
      medicinesList: effectiveMedicines,
      medicines: effectiveMedicines,
      medicineDuration: medicineDuration || "1 Month",
      discount: effectiveDiscount,
      discountApproved: effectiveDiscount,
      discountReason: discountReason || discountNotes || "",
      discountNotes: discountNotes || discountReason || "",
      discountStatus: discountStatus || (effectiveDiscount > 0 ? "APPROVED" : "NONE"),
      totalPaid: typeof totalPaid === "number" ? totalPaid : (typeof totalAmountDue === "number" ? totalAmountDue : parseFloat(totalAmountDue) || 0),
      invoiceId: invoiceId || `INV-${Date.now().toString().slice(-6)}`,
      hasPackage,
      packageInstallmentPaid,
      isRegularBilling,
      skipPackagePayment,
      splitDetails,
      payLaterAmount: typeof payLaterAmount === "number" ? payLaterAmount : parseFloat(payLaterAmount) || 0,
      previousDuePaid: typeof previousDuePaid === "number" ? previousDuePaid : parseFloat(previousDuePaid) || 0,
      dueDate,
      payLaterNotes,
    } as any);

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

