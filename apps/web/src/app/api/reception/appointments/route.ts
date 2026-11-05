import { NextRequest, NextResponse } from "next/server";
import { appointmentService, registrationSequenceService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const date = searchParams.get("date") || undefined;
    const doctorId = searchParams.get("doctorId") || undefined;

    const appointments = await appointmentService.getAppointments(branch, date, doctorId);
    return NextResponse.json({ success: true, appointments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      registrationId,
      patientName,
      phoneNumber,
      emailAddress,
      diseases,
      marketingSource,
      consultationMode,
      selectedDoctor,
      doctorName,
      appointmentDate,
      selectedTimeSlot,
      branch,
      isReback,
      notes,
    } = body;

    if (!patientName || !phoneNumber || !appointmentDate || !selectedTimeSlot) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (patientName, phoneNumber, appointmentDate, selectedTimeSlot)" },
        { status: 400 }
      );
    }

    const finalRegId =
      registrationId && registrationId !== "SPH-GEN"
        ? registrationId
        : await registrationSequenceService.getNextRegistrationId(branch || "KPB");

    const saved = await appointmentService.createAppointment({
      registrationId: finalRegId,
      patientName,
      phone: phoneNumber,
      email: emailAddress,
      diseases,
      marketingSource: marketingSource || "Walk-in Direct",
      consultationMode: consultationMode || "In-Clinic",
      doctorId: selectedDoctor || "doc-1",
      doctorName: doctorName || "Consultant Doctor",
      appointmentDate,
      timeSlot: selectedTimeSlot,
      branch: branch || "Clinic Branch",
      isReback: !!isReback,
      notes,
    });

    return NextResponse.json({ success: true, appointment: saved });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create appointment" },
      { status: 500 }
    );
  }
}

