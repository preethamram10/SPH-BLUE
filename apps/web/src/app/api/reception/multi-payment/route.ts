import { NextRequest, NextResponse } from "next/server";
import { appointmentService, payLaterService } from "@spiritualhomeo/database";
import { sendPaymentReceiptSms } from "@/lib/sms";
import { sendWhatsAppPaymentAndFeedbackFlow } from "@/lib/whatsapp";
import { buildInvoicePDFBlob } from "@/utils/generateInvoicePDF";

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
      const memberBillTotal = typeof m.totalAmountDue === "number" ? m.totalAmountDue : parseFloat(m.totalAmountDue) || memberPaid;
      const memberPayLater = typeof m.payLaterAmount === "number" ? m.payLaterAmount : parseFloat(m.payLaterAmount) || 0;
      const memberConsult = typeof m.consultationFee === "number" ? m.consultationFee : parseFloat(m.consultationFee) || 0;
      const memberMed = typeof m.medicineFee === "number" ? m.medicineFee : parseFloat(m.medicineFee) || 0;
      const memberOther = typeof m.otherCharges === "number" ? m.otherCharges : parseFloat(m.otherCharges) || 0;
      const memberDiscount = typeof m.discount === "number" ? m.discount : parseFloat(m.discount) || 0;
      const memberMeds = Array.isArray(m.medicinesList) ? m.medicinesList : [];
      const memberInvId = `${invId}-${i + 1}`;

      const updated = await appointmentService.recordAppointmentPayment(m.appointmentId, {
        paymentType: m.paymentType || "consult_and_med",
        consultationFee: memberConsult,
        medicineFee: memberMed,
        dietPlanFee: 0,
        otherCharges: memberOther,
        totalAmountDue: memberBillTotal,
        totalPaid: memberPaid,
        payLaterAmount: memberPayLater,
        paymentMethod: finalMethod,
        paymentMode: finalMethod,
        medicinesList: memberMeds,
        medicines: memberMeds,
        medicineDuration: m.medicineDuration || "1 Month",
        discount: memberDiscount,
        discountApproved: memberDiscount,
        discountReason: memberDiscount > 0 ? "Family Multi-Pay checkout discount" : undefined,
        discountStatus: memberDiscount > 0 ? "APPROVED" : "NONE",
        invoiceId: memberInvId,
        isMultiPay: true,
        masterInvoiceId: invId,
        splitDetails,
      } as any);

      if (memberPayLater > 0) {
        try {
          await payLaterService.createPayLater({
            patientName: m.patientName || appt.patientName || "Patient",
            phone: m.phone || appt.phone || "",
            branch: appt.branch || "Kphb Branch",
            registrationId: m.registrationId || appt.registrationId,
            appointmentId: m.appointmentId,
            invoiceId: memberInvId,
            originalBillAmount: memberBillTotal,
            amountPaid: memberPaid,
            pendingAmount: memberPayLater,
            visitDate: appt.appointmentDate || new Date().toISOString(),
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            notes: m.payLaterNotes || "Recorded during Family Multi-Pay checkout",
          });
        } catch (plErr) {
          console.warn("Failed to create individual pay later record in multi-payment:", plErr);
        }
      }

      if (updated) {
        updatedAppointments.push(updated);
        let pdfBuffer: Buffer | undefined;
        try {
          const pdfBlob = buildInvoicePDFBlob(updated as any);
          pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
        } catch {}

        await Promise.allSettled([
          sendPaymentReceiptSms({
            mobile: updated.phone,
            patientName: updated.patientName,
            amount: updated.totalPaid ?? memberPaid ?? 0,
            receiptNo: updated.invoiceId || memberInvId,
            date: updated.appointmentDate,
            branch: updated.branch,
          }),
          sendWhatsAppPaymentAndFeedbackFlow({
            mobile: updated.phone,
            patientName: updated.patientName,
            amount: updated.totalPaid ?? memberPaid ?? 0,
            receiptNo: updated.invoiceId || memberInvId,
            date: updated.appointmentDate,
            branch: updated.branch,
            pdfBuffer,
          }),
        ]);
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
