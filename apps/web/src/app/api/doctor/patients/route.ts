import { NextRequest, NextResponse } from "next/server";
import { appointmentService, normalizeDateStr } from "@spiritualhomeo/database";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorName = searchParams.get("doctorName") || "Dr. Prashanth K Vaidya";
    const branch = searchParams.get("branch") || undefined;
    const session = searchParams.get("session") || "ALL"; // TODAY | YESTERDAY | ALL
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    // Determine date filter for session
    let dateFilter: string | undefined;
    if (session === "TODAY") {
      dateFilter = toDateStr(new Date());
    } else if (session === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      dateFilter = toDateStr(y);
    }

    const appointments = await appointmentService.getAppointments(branch, dateFilter, doctorName);

    // Group appointments by patient registration ID — most recent appointment date first
    const patientMap = new Map<string, any>();

    appointments.forEach((a) => {
      const regId = a.registrationId || "SPH-GEN";
      if (!patientMap.has(regId)) {
        patientMap.set(regId, {
          id: regId,
          registrationId: regId,
          name: a.patientName,
          patientName: a.patientName,
          phone: a.phone || "",
          diseases: a.diseases || "General Consultation",
          lastVisitDate: normalizeDateStr(a.appointmentDate),
          lastSlot: a.timeSlot,
          status: a.status,
          totalVisits: 1,
          branch: a.branch,
          doctorName: a.doctorName,
        });
      } else {
        const existing = patientMap.get(regId);
        existing.totalVisits += 1;
        // Keep track of latest visit date
        const normApptDate = normalizeDateStr(a.appointmentDate);
        if (normApptDate > existing.lastVisitDate) {
          existing.lastVisitDate = normApptDate;
          existing.lastSlot = a.timeSlot;
          existing.status = a.status;
        }
      }
    });

    let patients = Array.from(patientMap.values());
    // Sort newest first
    patients = patients.sort((a, b) =>
      (b.lastVisitDate || "").localeCompare(a.lastVisitDate || "")
    );

    const totalCount = patients.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const paged = patients.slice(start, start + pageSize);

    return NextResponse.json({ success: true, patients: paged, totalCount, totalPages, currentPage: page, pageSize });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
