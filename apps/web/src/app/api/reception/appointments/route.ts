import { NextRequest, NextResponse } from "next/server";
import { appointmentService, registrationSequenceService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

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

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : null;
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
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

    // Past dates & past time slots validation (Old Entry / Old Patient RX is used for historical records)
    const now = new Date();
    const todayYYYYMMDD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dateParts = String(appointmentDate).split("-");
    const normalizedAptDate = dateParts.length === 3
      ? dateParts[0].length === 4
        ? `${dateParts[0]}-${dateParts[1].padStart(2, "0")}-${dateParts[2].padStart(2, "0")}`
        : `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`
      : String(appointmentDate);

    if (normalizedAptDate < todayYYYYMMDD) {
      return NextResponse.json(
        { success: false, error: "Cannot book appointments for past dates. For historical patient records, please use Old Patient RX." },
        { status: 400 }
      );
    }

    if (normalizedAptDate === todayYYYYMMDD && selectedTimeSlot) {
      const slotMin = parseTimeToMinutes(selectedTimeSlot);
      const currentMin = now.getHours() * 60 + now.getMinutes();
      if (slotMin > 0 && slotMin < currentMin) {
        return NextResponse.json(
          { success: false, error: `Time slot ${selectedTimeSlot} has already passed for today. Please select an upcoming slot.` },
          { status: 400 }
        );
      }
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
    const isConflict = error.message?.includes("already fully booked");
    const isValidation = error.message?.includes("required") || error.message?.includes("Invalid phone");
    const status = isConflict ? 409 : isValidation ? 400 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create appointment" },
      { status }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, status, orderedIds, appointmentDate, timeSlot } = body;

    if (action === "REORDER" && Array.isArray(orderedIds)) {
      await appointmentService.reorderAppointments(orderedIds);
      return NextResponse.json({ success: true });
    }

    if (action === "UPDATE_STATUS" && id && status) {
      const updated = await appointmentService.updateAppointmentStatus(id, status);
      return NextResponse.json({ success: !!updated, appointment: updated });
    }

    if (action === "RESCHEDULE" && id && appointmentDate && timeSlot) {
      const updated = await appointmentService.rescheduleAppointment(id, appointmentDate, timeSlot);
      return NextResponse.json({ success: !!updated, appointment: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update appointments" },
      { status: 500 }
    );
  }
}

