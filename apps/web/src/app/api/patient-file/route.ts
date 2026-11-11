import { NextRequest, NextResponse } from "next/server";
import { appointmentService, matchPatientProfile, packageService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Appointment ID is required" }, { status: 400 });
    }

    let appt = await appointmentService.getAppointmentById(id);
    if (!appt) {
      // Fallback: check if id is a registrationId or phone
      const allAppts = await appointmentService.getAppointments();
      const cleanSearch = id.trim().toUpperCase();
      const matches = allAppts
        .filter((a) => !a.isDeleted && ((a.registrationId || "").trim().toUpperCase() === cleanSearch || (a.phone || "").replace(/\D/g, "").slice(-10) === id.replace(/\D/g, "").slice(-10)))
        .sort((a, b) => (b.appointmentDate || "").localeCompare(a.appointmentDate || ""));
      if (matches.length > 0) {
        appt = matches[0];
      }
    }

    if (!appt) {
      return NextResponse.json({ success: false, error: "Patient record not found" }, { status: 404 });
    }

    // Get all visits for THIS specific patient profile only (isolated by registrationId/name, NOT shared by phone)
    const all = await appointmentService.getAppointments();
    const allPatientVisits = all.filter(
      (a) => !a.isDeleted && matchPatientProfile(a, appt)
    );

    // Compute total paid across all visits of this patient profile
    let totalLifetimePaid = 0;
    allPatientVisits.forEach((v) => {
      const isPaid = Boolean(v.isFeeCollected || v.paidAt || v.status === "COMPLETED");
      let paidForVisit = 0;
      if (typeof v.totalPaid === "number" && v.totalPaid > 0) {
        paidForVisit = v.totalPaid;
      } else if (isPaid) {
        const due = typeof v.totalAmountDue === "number" && v.totalAmountDue > 0
          ? v.totalAmountDue
          : (v.consultationFee || 0) + (v.medicineFee || 0) + (v.dietPlanFee || 0);
        const discount = v.discountApproved || v.discount || 0;
        const payLater = v.payLaterAmount || 0;
        paidForVisit = Math.max(0, due - discount - payLater);
      }
      if (v.previousDuePaid && v.previousDuePaid > 0) {
        paidForVisit += v.previousDuePaid;
      }
      totalLifetimePaid += paidForVisit;
    });

    // History visits: include previous visits, plus current appointment if it already has prescriptions or fees
    const historyVisits = allPatientVisits
      .filter((a) => a.id !== appt.id || (a.prescriptionImages && a.prescriptionImages.length > 0) || a.isFeeCollected || a.status === "COMPLETED" || (typeof a.totalPaid === "number" && a.totalPaid > 0))
      .sort((a, b) => {
        const dtA = a.appointmentDate || a.createdAt || "";
        const dtB = b.appointmentDate || b.createdAt || "";
        return dtB.localeCompare(dtA);
      });

    const activePkg = await packageService.getPackageByProfile(appt.registrationId || appt.phone, appt.patientName);

    return NextResponse.json({
      success: true,
      patientFile: {
        ...appt,
        followUpDate: appt.followUpDate || (appt as any).activeFollowUpDate || "",
        totalVisits: allPatientVisits.length,
        totalPaid: totalLifetimePaid,
        activePackage: activePkg || null,
        hasPackage: !!activePkg,
        packageName: activePkg?.packageName || (appt as any).packageName || "",
        history: historyVisits.map((h) => {
          const isPaid = Boolean(h.isFeeCollected || h.paidAt || h.status === "COMPLETED");
          const consultationFee = h.consultationFee || 0;
          const medicineFee = h.medicineFee || 0;
          const dietPlanFee = h.dietPlanFee || 0;
          const discount = h.discountApproved || h.discount || 0;
          const totalAmountDue = typeof h.totalAmountDue === "number" && h.totalAmountDue > 0
            ? h.totalAmountDue
            : consultationFee + medicineFee + dietPlanFee;
          const totalPaid = typeof h.totalPaid === "number" && h.totalPaid > 0
            ? h.totalPaid
            : isPaid
            ? Math.max(0, totalAmountDue - discount - (h.payLaterAmount || 0))
            : 0;

          return {
            id: h.id,
            isCurrent: h.id === appt.id,
            token: h.token || "",
            date: h.appointmentDate,
            timeSlot: h.timeSlot || "",
            doctorName: h.doctorName || "",
            branch: h.branch || "",
            status: h.status,
            isFeeCollected: isPaid,
            diagnosisNotes: h.diagnosisNotes || h.notes || "",
            consultationFee,
            medicineFee,
            medicinesList: h.medicinesList || [],
            medicineDuration: h.medicineDuration || "",
            dietPlanFee,
            discount,
            totalAmountDue,
            totalPaid,
            payLaterAmount: h.payLaterAmount || 0,
            pendingBalance: h.pendingBalance || 0,
            paymentMethod: h.paymentMethod || (isPaid ? "CASH" : ""),
            invoiceId: h.invoiceId || "",
            paidAt: h.paidAt || "",
            followUpDate: h.followUpDate || "",
            followUpInterval: h.followUpInterval || "",
            prescriptionImages: h.prescriptionImages || [],
          };
        }),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load patient file" },
      { status: 500 }
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      diagnosisNotes,
      prescriptionText,
      prescriptionImages,
      followUpInterval,
      followUpDate,
      consultationFee,
      dietPlan,
      sendToReception,
      markCompleted,
    } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Appointment ID is required" }, { status: 400 });
    }
    const updated = await appointmentService.updatePatientFile(id, {
      diagnosisNotes,
      prescriptionText,
      prescriptionImages,
      followUpInterval,
      followUpDate,
      consultationFee: typeof consultationFee === "string" ? parseFloat(consultationFee) || 0 : consultationFee,
      dietPlan,
      isSentToReception: true,
      status: "COLLECT_FEE",
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Failed to update patient file" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      appointment: updated,
      message: sendToReception
        ? "Prescription and notes sent to Reception for fee collection!"
        : "Patient file saved successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save patient file" },
      { status: 500 }
    );
  }
}

