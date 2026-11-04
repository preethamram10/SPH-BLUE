import { NextRequest, NextResponse } from "next/server";
import { doctorScheduleService, employeeService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const day = searchParams.get("day");
    const doctorId = searchParams.get("doctorId");

    // Filter by branch and day (for Reception Book Appointment)
    if (branch && day) {
      const available = await doctorScheduleService.getDoctorsAvailable(branch, day);
      return NextResponse.json({ success: true, doctors: available });
    }

    // Get specific doctor schedule
    if (doctorId) {
      const schedule = await doctorScheduleService.getScheduleByDoctorId(doctorId);
      return NextResponse.json({ success: true, schedule });
    }

    // Return all schedules + all doctors
    const [schedules, allDoctors] = await Promise.all([
      doctorScheduleService.getAllSchedules(),
      employeeService.getAllEmployees("DOCTOR"),
    ]);

    return NextResponse.json({
      success: true,
      schedules,
      doctors: allDoctors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch doctor timings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.doctorId && !body.id) {
      return NextResponse.json(
        { success: false, error: "Doctor ID is required" },
        { status: 400 }
      );
    }

    const saved = await doctorScheduleService.saveSchedule({
      id: body.id || body.doctorId,
      doctorId: body.doctorId || body.id,
      doctorName: body.doctorName || "Doctor",
      phone: body.phone || "",
      specialty: body.specialty,
      branchSchedules: body.branchSchedules || [],
    });

    return NextResponse.json({ success: true, schedule: saved });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save doctor timing schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId") || searchParams.get("id");
    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: "Doctor ID is required" },
        { status: 400 }
      );
    }

    await doctorScheduleService.deleteSchedule(doctorId);
    return NextResponse.json({ success: true, message: "Doctor schedule deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete doctor timing schedule" },
      { status: 500 }
    );
  }
}

