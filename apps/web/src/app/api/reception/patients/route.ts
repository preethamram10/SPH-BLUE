import { NextRequest, NextResponse } from "next/server";
import { patientService, appointmentService, normalizeDateStr } from "@spiritualhomeo/database";

/** Returns YYYY-MM-DD for a given Date (local zone of the server) */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regId = searchParams.get("regId");
    const query = searchParams.get("query");
    const branch = searchParams.get("branch") || undefined;
    const session = searchParams.get("session") || "ALL"; // TODAY | YESTERDAY | ALL
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    // Lookup by Registration ID (Exact)
    if (regId) {
      const patient = await patientService.getByRegId(regId);
      return NextResponse.json({ success: true, patient });
    }

    // Search by text query (autocomplete)
    if (query) {
      const suggestions = await patientService.searchPatients(query, branch);
      return NextResponse.json({ success: true, suggestions });
    }

    // List all patients for this branch
    let all = await patientService.getAllPatients(branch);

    // Fetch appointments to map visit counts & latest doctor/date
    const allAppts = await appointmentService.getAppointments();
    const apptsByRegId = new Map<string, any[]>();
    allAppts.forEach((a) => {
      if (a.isDeleted) return;
      const key = (a.registrationId || "").trim().toUpperCase();
      if (!key) return;
      if (!apptsByRegId.has(key)) apptsByRegId.set(key, []);
      apptsByRegId.get(key)!.push(a);
    });

    let enriched = all.map((p) => {
      const pAppts = apptsByRegId.get((p.regId || "").trim().toUpperCase()) || [];
      const totalVisits = pAppts.length;
      const sorted = [...pAppts].sort((a, b) => (b.appointmentDate || "").localeCompare(a.appointmentDate || ""));
      const latest = sorted[0];
      return {
        ...p,
        totalVisits,
        appointmentCount: totalVisits,
        lastVisitDate: normalizeDateStr(latest?.appointmentDate || p.createdAt?.slice(0, 10) || ""),
        lastDoctorName: latest?.doctorName || "",
      };
    });

    // Session filter: for TODAY / YESTERDAY, filter patients who had an appointment that day
    if (session === "TODAY" || session === "YESTERDAY") {
      const now = new Date();
      let targetDate: Date;
      if (session === "TODAY") {
        targetDate = now;
      } else {
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() - 1);
      }
      const targetDateStr = toDateStr(targetDate);

      // Get all appointments for this branch on the target date
      const appts = await appointmentService.getAppointments(branch, targetDateStr);
      const regIdsWithAppt = new Set(appts.map((a) => (a.registrationId || "").trim().toUpperCase()));

      // Keep only patients who had an appointment on that day
      enriched = enriched.filter((p) => regIdsWithAppt.has(p.regId.trim().toUpperCase()));
    }

    // Sort: newest first by createdAt
    enriched = enriched.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    const totalCount = enriched.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const paged = enriched.slice(start, start + pageSize);

    return NextResponse.json({
      success: true,
      patients: paged,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query patients" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { regId, name, phone, email, diseases, branch } = body;

    if (!regId || !name || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (regId, name, phone)" },
        { status: 400 }
      );
    }

    const saved = await patientService.upsertPatient({
      regId,
      name,
      phone,
      email,
      diseases,
      branch: branch || "Clinic Branch",
    });

    return NextResponse.json({ success: true, patient: saved });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save patient" },
      { status: 500 }
    );
  }
}

