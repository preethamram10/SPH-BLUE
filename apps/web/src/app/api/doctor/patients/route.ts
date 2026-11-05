import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorName = searchParams.get("doctorName") || "Dr. Prashanth K Vaidya";
    const branch = searchParams.get("branch") || undefined;

    const appointments = await appointmentService.getAppointments(branch, undefined, doctorName);

    // Group appointments by patient registration ID
    const patientMap = new Map<string, any>();

    appointments.forEach((a) => {
      const regId = a.registrationId || "SPH-GEN";
      if (!patientMap.has(regId)) {
        patientMap.set(regId, {
          registrationId: regId,
          patientName: a.patientName,
          phone: a.phone || "",
          diseases: a.diseases || "General Consultation",
          lastVisitDate: a.appointmentDate,
          lastSlot: a.timeSlot,
          status: a.status,
          totalVisits: 1,
          branch: a.branch,
        });
      } else {
        const existing = patientMap.get(regId);
        existing.totalVisits += 1;
      }
    });

    const patients = Array.from(patientMap.values());
    return NextResponse.json({ success: true, patients, totalCount: patients.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
