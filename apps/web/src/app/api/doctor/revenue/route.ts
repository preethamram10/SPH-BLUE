import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorName = searchParams.get("doctorName") || "Dr. Prashanth K Vaidya";
    const branch = searchParams.get("branch") || undefined;

    // Fetch all historical appointments for this doctor
    const allAppointments = await appointmentService.getAppointments(branch, undefined, doctorName);

    const completed = allAppointments.filter((a) => {
      if ((a.status || "").toUpperCase() !== "COMPLETED") return false;
      if (a.isDeleted) return false;
      if ((a as any).isHistorical) return false;
      const src = (a.marketingSource || "").toLowerCase();
      const notes = ((a.diagnosisNotes || "") + " " + (a.notes || "")).toLowerCase();
      if (
        src.includes("historical") ||
        src.includes("old record") ||
        src.includes("old entry") ||
        src.includes("uploaded") ||
        notes.includes("historical prescription") ||
        notes.includes("historical entry")
      ) {
        return false;
      }
      return true;
    });
    const activeWaiting = allAppointments.filter((a) => (a.status || "").toUpperCase() !== "COMPLETED");

    // Compute consultation & package earnings from real appointments
    const consultationEarnings = completed.reduce(
      (sum, a) => sum + (Number(a.consultationFee) || 0),
      0
    );

    // Actual package / treatment enrollments for this doctor
    const packageEarnings = completed.reduce(
      (sum, a) => sum + (Number(a.dietPlanFee || a.otherCharges) || 0),
      0
    );
    const totalRevenue = consultationEarnings + packageEarnings;

    // Recent revenue transactions
    const recentTransactions = completed.slice(0, 10).map((a, idx) => {
      const amt =
        typeof a.totalPaid === "number" && a.totalPaid > 0
          ? a.totalPaid
          : typeof a.totalAmountDue === "number" && a.totalAmountDue > 0
          ? a.totalAmountDue
          : Number(a.consultationFee) || 0;
      return {
        id: a.id || `tx-${idx}`,
        patientName: a.patientName,
        registrationId: a.registrationId,
        date: a.appointmentDate,
        service: a.diseases ? `Consultation (${a.diseases})` : "Standard Consultation",
        amount: amt,
        paymentMode: a.paymentMethod || (idx % 2 === 0 ? "UPI" : "Cash"),
        consultationMode: (a.consultationMode || (a as any).mode || "").toLowerCase().includes("online") ? "Online" : "In-Clinic",
        status: "Collected",
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        doctorName,
        totalRevenue,
        consultationEarnings,
        packageEarnings,
        completedConsultations: completed.length,
        pendingConsultations: activeWaiting.length,
        totalPatientsTreated: completed.length,
        monthlyTarget: 50000,
        targetProgress: Math.min(100, Math.round((totalRevenue / 50000) * 100)),
      },
      recentTransactions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate doctor revenue" },
      { status: 500 }
    );
  }
}

