import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      masterInvoiceId,
      paymentMethod,
      paymentMode,
      totalGrandPaid,
      splitDetails,
      members,
    } = body;

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one family appointment member is required for Multi-Pay." },
        { status: 400 }
      );
    }

    const finalMethod = (paymentMethod || paymentMode || "Counter UPI") as any;
    const invId = masterInvoiceId || `INV-FAM-${Date.now().toString().slice(-6)}`;
    const updatedAppointments: any[] = [];

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.appointmentId) continue;

      const appt = await appointmentService.getAppointmentById(m.appointmentId);
      if (!appt) continue;

      const memberPaid = typeof m.totalPaid === "number" ? m.totalPaid : parseFloat(m.totalPaid) || 0;
      const memberConsult = typeof m.consultationFee === "number" ? m.consultationFee : parseFloat(m.consultationFee) || 0;
      const memberMed = typeof m.medicineFee === "number" ? m.medicineFee : parseFloat(m.medicineFee) || 0;
      const memberOther = typeof m.otherCharges === "number" ? m.otherCharges : parseFloat(m.otherCharges) || 0;
      const memberDiscount = typeof m.discount === "number" ? m.discount : parseFloat(m.discount) || 0;
      const memberMeds = Array.isArray(m.medicinesList) ? m.medicinesList : [];

      const updated = await appointmentService.recordAppointmentPayment(m.appointmentId, {
        paymentType: "consult_and_med",
        consultationFee: memberConsult,
        medicineFee: memberMed,
        dietPlanFee: 0,
        otherCharges: memberOther,
        totalAmountDue: memberPaid,
        totalPaid: memberPaid,
        paymentMethod: finalMethod,
        paymentMode: finalMethod,
        medicinesList: memberMeds,
        medicines: memberMeds,
        medicineDuration: m.medicineDuration || "1 Month",
        discount: memberDiscount,
        discountApproved: memberDiscount,
        discountReason: "Family Multi-Pay checkout discount",
        discountStatus: memberDiscount > 0 ? "APPROVED" : "NONE",
        invoiceId: `${invId}-${i + 1}`,
        isMultiPay: true,
        masterInvoiceId: invId,
        splitDetails,
      } as any);

      if (updated) {
        updatedAppointments.push(updated);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Family Multi-Payment of ₹${totalGrandPaid} successfully recorded for ${updatedAppointments.length} members.`,
      masterInvoiceId: invId,
      appointments: updatedAppointments,
    });
  } catch (error: any) {
    console.error("Multi-Payment API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process multi-payment." },
      { status: 500 }
    );
  }
}
