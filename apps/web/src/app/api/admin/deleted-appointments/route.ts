import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    // Admin role: strictly 48 hours retention
    let appointments = await appointmentService.getDeletedAppointments("ADMIN", branch);

    if (search) {
      appointments = appointments.filter((a) => {
        const pName = (a.patientName || "").toLowerCase();
        const pPhone = (a.phone || "").toLowerCase();
        const pReg = (a.registrationId || "").toLowerCase();
        const pDoc = (a.doctorName || "").toLowerCase();
        const pToken = (a.token || "").toLowerCase();
        return (
          pName.includes(search) ||
          pPhone.includes(search) ||
          pReg.includes(search) ||
          pDoc.includes(search) ||
          pToken.includes(search)
        );
      });
    }

    // Branch-wise monthly counter (resets every month)
    const monthlyStats = await appointmentService.getMonthlyDeletedAppointmentsCount();

    return NextResponse.json({
      success: true,
      appointments,
      monthlyStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch admin deleted appointments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Appointment ID is required" }, { status: 400 });
    }

    if (action === "RESTORE") {
      const restored = await appointmentService.restoreAppointment(id);
      if (!restored) {
        return NextResponse.json({ success: false, error: "Appointment not found or expired (>48h)" }, { status: 404 });
      }
      return NextResponse.json({ success: true, appointment: restored });
    }

    if (action === "PERMANENT_DELETE") {
      const deleted = await appointmentService.permanentlyDeleteAppointment(id);
      if (!deleted) {
        return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Appointment permanently purged" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

