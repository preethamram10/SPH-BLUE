import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorName = searchParams.get("doctorName") || searchParams.get("doctorId") || "Dr. Prashanth K Vaidya";
    const branch = searchParams.get("branch") || undefined;
    const date = searchParams.get("date") || undefined;

    // Fetch appointments for this doctor
    const appointments = await appointmentService.getAppointments(branch, date, doctorName);
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
    } else if (action === "COMPLETE_CONSULTATION") {
      targetStatus = "COMPLETED";
    }

    const updated = await appointmentService.updateAppointmentStatus(id, targetStatus || "IN_CONSULTATION");
    if (!updated) {
      return NextResponse.json({ success: false, error: "Appointment not found or failed to update" }, { status: 404 });
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
