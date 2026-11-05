import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;

    // Reception role: strictly 24 hours retention
    const deleted = await appointmentService.getDeletedAppointments("RECEPTION", branch);
    return NextResponse.json({ success: true, appointments: deleted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch deleted appointments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, deletedBy, reason } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Appointment ID is required" }, { status: 400 });
    }

    if (action === "DELETE") {
      const deleted = await appointmentService.deleteAppointment(
        id,
        deletedBy || "Reception",
        "RECEPTION",
        reason || "Cancelled by Reception"
      );
      if (!deleted) {
        return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, appointment: deleted });
    }

    if (action === "RESTORE") {
      const restored = await appointmentService.restoreAppointment(id);
      if (!restored) {
        return NextResponse.json({ success: false, error: "Appointment not found or already purged" }, { status: 404 });
      }
      return NextResponse.json({ success: true, appointment: restored });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

