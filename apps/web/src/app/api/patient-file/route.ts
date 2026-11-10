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

    // Get previous visits for THIS specific patient profile only (isolated by registrationId/name, NOT shared by phone)
    const all = await appointmentService.getAppointments();
    const history = all.filter(
      (a) =>
        a.id !== appt.id &&
        !a.isDeleted &&
        matchPatientProfile(a, appt)
    );

    const activePkg = await packageService.getPackageByProfile(appt.registrationId || appt.phone, appt.patientName);

    return NextResponse.json({
      success: true,
      patientFile: {
        ...appt,
        followUpDate: appt.followUpDate || (appt as any).activeFollowUpDate || "",
        totalVisits: history.length + 1,
        totalPaid: history.reduce((sum, h) => sum + (h.consultationFee || 0), 0) + (appt.consultationFee || 0),
        activePackage: activePkg || null,
        hasPackage: !!activePkg,
        packageName: activePkg?.packageName || (appt as any).packageName || "",
        history: history.map((h) => ({
          id: h.id,
          date: h.appointmentDate,
          doctorName: h.doctorName,
          status: h.status,
          diagnosisNotes: h.diagnosisNotes || h.notes,
          consultationFee: h.consultationFee || 0,
          prescriptionImages: h.prescriptionImages || [],
        })),
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

