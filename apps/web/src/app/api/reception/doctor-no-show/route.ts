import { NextRequest, NextResponse } from "next/server";
import { doctorNoShowService, doctorScheduleService, employeeService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const date = searchParams.get("date") || undefined;

    const noShows = await doctorNoShowService.getAllNoShows(branch, date);

    // If branch is provided, fetch doctors configured specifically for this branch
    let doctors: { doctorId: string; doctorName: string; phone: string }[] = [];
    if (branch) {
      doctors = await doctorNoShowService.getDoctorsAvailableForBranch(branch);
      // Fallback: If no doctors are mapped yet in master doctor timings, load all doctor employees
      if (doctors.length === 0) {
        const allDocEmployees = await employeeService.getAllEmployees("DOCTOR");
        doctors = allDocEmployees.map((e) => ({
          doctorId: e.id,
          doctorName: e.name,
          phone: e.phone,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      noShows,
      doctors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch doctor no-shows" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      doctorId,
      doctorName,
      branch,
      type,
      startDate,
      endDate,
      halfDayType,
      startTime,
      endTime,
      reason,
    } = body;

    if (!doctorId || !doctorName || !branch || !type || !startDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (doctorId, doctorName, branch, type, startDate)" },
        { status: 400 }
      );
    }

    const record = await doctorNoShowService.addNoShow({
      doctorId,
      doctorName,
      branch,
      type,
      startDate,
      endDate: endDate || startDate,
      halfDayType: type === "HALF_DAY" ? halfDayType || "FIRST_HALF" : undefined,
      startTime: type === "SPECIFIC_TIME" ? startTime : undefined,
      endTime: type === "SPECIFIC_TIME" ? endTime : undefined,
      reason: reason || "",
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save doctor no-show record" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Record ID is required" },
        { status: 400 }
      );
    }

    await doctorNoShowService.deleteNoShow(id);
    return NextResponse.json({ success: true, message: "Doctor no-show removed" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete doctor no-show" },
      { status: 500 }
    );
  }
}

