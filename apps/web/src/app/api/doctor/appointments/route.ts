import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawDoc = searchParams.get("doctorName") || searchParams.get("doctorId");
    // Strictly require a doctor identity so the doctor only sees their own patients
    const doctorName = (rawDoc && rawDoc !== "All Doctors" && rawDoc !== "ALL") 
      ? rawDoc 
      : "Dr. Prashanth K Vaidya";
    const rawBranch = searchParams.get("branch") || undefined;
    const branch = (rawBranch && rawBranch !== "All Branches" && rawBranch !== "ALL") ? rawBranch : undefined;
    const rawDate = searchParams.get("date");
    const date = (rawDate && rawDate !== "ALL" && rawDate !== "All Dates" && rawDate.toLowerCase() !== "all") ? rawDate : undefined;

    // Fetch appointments strictly for this doctor (no branch restriction by default)
    let appointments = await appointmentService.getAppointments(branch, date, doctorName);

    // If viewing a specific date (e.g. Today), also include any active IN_CONSULTATION appointments for this doctor from past dates
    if (date) {
      const allDocAppts = await appointmentService.getAppointments(branch, undefined, doctorName);
      const activeUnfinishedFromPast = allDocAppts.filter(
        (a) => a.status === "IN_CONSULTATION" && !appointments.some((x) => x.id === a.id)
      );
      if (activeUnfinishedFromPast.length > 0) {
        appointments = [...activeUnfinishedFromPast, ...appointments];
      }
    }
    return NextResponse.json({ success: true, appointments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch doctor appointments" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, status, orderedIds, appointmentDate, timeSlot } = body;

    // 1. REORDER QUEUE
    if (action === "REORDER" && Array.isArray(orderedIds)) {
      await appointmentService.reorderAppointments(orderedIds);
      return NextResponse.json({ success: true });
    }

    // 2. RESCHEDULE APPOINTMENT
    if (action === "RESCHEDULE" && id && appointmentDate && timeSlot) {
      const updated = await appointmentService.rescheduleAppointment(id, appointmentDate, timeSlot);
      return NextResponse.json({ success: !!updated, appointment: updated });
    }

    // 3. STATUS UPDATES
    if (!id) {
      return NextResponse.json({ success: false, error: "Appointment ID is required" }, { status: 400 });
    }

    let targetStatus = status;
    if (action === "START_CONSULTATION") {
      targetStatus = "IN_CONSULTATION";
    } else if (action === "COMPLETE_CONSULTATION" || action === "SEND_TO_RECEPTION") {
      // Consultation finished by doctor -> Dispatched to Reception for fee collection
      targetStatus = "COLLECT_FEE";
    }

    const updated = await appointmentService.updateAppointmentStatus(id, targetStatus || "IN_CONSULTATION");
    if (!updated) {
      return NextResponse.json({ success: false, error: "Appointment not found or failed to update" }, { status: 404 });
    }

    if (targetStatus === "COLLECT_FEE") {
      await appointmentService.updatePatientFile(id, { isSentToReception: true, status: "COLLECT_FEE" });
    }

    return NextResponse.json({
      success: true,
      appointment: updated,
      message: `Status updated to ${targetStatus}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update appointment status" },
      { status: 500 }
    );
  }
}
