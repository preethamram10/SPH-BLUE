import { NextRequest, NextResponse } from "next/server";
import { patientService, appointmentService, normalizeDateStr } from "@spiritualhomeo/database";

/** Returns YYYY-MM-DD for a given Date (local zone of the server) */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regId = searchParams.get("regId");
    const query = searchParams.get("query");
    const search = (searchParams.get("search") || "").trim();
    const branch = searchParams.get("branch") || undefined;
    const session = searchParams.get("session") || "ALL"; // TODAY | YESTERDAY | ALL
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    // Lookup by Registration ID (Exact)
    if (regId) {
      const patient = await patientService.getByRegId(regId);
      return NextResponse.json({ success: true, patient });
    }

    // Autocomplete quick search (returns suggestions array capped at 15 items)
    if (query) {
      const suggestions = await patientService.searchPatients(query, branch, 15);
      return NextResponse.json({ success: true, suggestions });
    }

    // Fast session counts summary for the tabs (TODAY, YESTERDAY, ALL) in a single ultra-fast call
    if (searchParams.get("summary") === "true") {
      const allPatients = await patientService.getAllPatients(branch);
      const now = new Date();
      const todayStr = toDateStr(now);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = toDateStr(yesterday);

      const [todayAppts, yesterdayAppts] = await Promise.all([
        appointmentService.getAppointments(branch, todayStr, undefined, false, false),
        appointmentService.getAppointments(branch, yesterdayStr, undefined, false, false),
      ]);

      const todayRegs = new Set(todayAppts.map((a) => (a.registrationId || "").trim().toUpperCase()).filter(Boolean));
      const yesterdayRegs = new Set(yesterdayAppts.map((a) => (a.registrationId || "").trim().toUpperCase()).filter(Boolean));

      const isTodayPatient = (p: any) => {
        const pCreated = p.createdAt ? normalizeDateStr(p.createdAt.slice(0, 10)) : "";
        return pCreated === todayStr || todayRegs.has((p.regId || "").trim().toUpperCase());
      };
      const isYesterdayPatient = (p: any) => {
        const pCreated = p.createdAt ? normalizeDateStr(p.createdAt.slice(0, 10)) : "";
        return pCreated === yesterdayStr || yesterdayRegs.has((p.regId || "").trim().toUpperCase());
      };

      const todayCount = allPatients.filter(isTodayPatient).length;
      const yesterdayCount = allPatients.filter(isYesterdayPatient).length;
      const allCount = allPatients.length;

      return NextResponse.json({
        success: true,
        counts: {
          TODAY: todayCount,
          YESTERDAY: yesterdayCount,
          ALL: allCount,
        },
      });
    }

    // List patients: if search query is provided, search across all records using hash maps
    let all: any[] = [];
    if (search) {
      all = await patientService.searchPatients(search, branch, 200);
    } else {
      all = await patientService.getAllPatients(branch);
    }

    // Session filter: for TODAY / YESTERDAY (only if not actively searching for a specific patient)
    if (!search && (session === "TODAY" || session === "YESTERDAY")) {
      const now = new Date();
      let targetDate: Date;
      if (session === "TODAY") {
        targetDate = now;
      } else {
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() - 1);
      }
      const targetDateStr = toDateStr(targetDate);

      // Get all appointments for this branch on the target date (undecorated, fast)
      const appts = await appointmentService.getAppointments(branch, targetDateStr, undefined, false, false);
      const regIdsWithAppt = new Set(appts.map((a) => (a.registrationId || "").trim().toUpperCase()).filter(Boolean));

      // Keep patients who had an appointment on that day OR were created on that day
      all = all.filter((p) => {
        const pCreated = p.createdAt ? normalizeDateStr(p.createdAt.slice(0, 10)) : "";
        return pCreated === targetDateStr || regIdsWithAppt.has((p.regId || "").trim().toUpperCase());
      });
    }

    // Total count before pagination
    const totalCount = all.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const pagedRaw = all.slice(start, start + pageSize);

    // If only requesting count (pageSize === 1) or empty page, return fast without heavy enrichment
    if (pageSize === 1 || pagedRaw.length === 0) {
      return NextResponse.json({
        success: true,
        patients: [],
        totalCount,
        totalPages,
        currentPage: page,
        pageSize,
      });
    }

    // High-performance targeted enrichment ONLY for the current page items
    // Use decorate = false so appointmentService does NOT decorate all 15,000 database appointments
    const pageRegIds = new Set(pagedRaw.map((p) => (p.regId || "").trim().toUpperCase()).filter(Boolean));
    const allAppts = await appointmentService.getAppointments(undefined, undefined, undefined, false, false);
    const apptsByRegId = new Map<string, any[]>();

    allAppts.forEach((a) => {
      if (a.isDeleted) return;
      const key = (a.registrationId || "").trim().toUpperCase();
      if (!key || !pageRegIds.has(key)) return;
      if (!apptsByRegId.has(key)) apptsByRegId.set(key, []);
      apptsByRegId.get(key)!.push(a);
    });

    const paged = pagedRaw.map((p) => {
      const pAppts = apptsByRegId.get((p.regId || "").trim().toUpperCase()) || [];
      const totalVisits = pAppts.length;
      const sorted = [...pAppts].sort((a, b) =>
        (b.appointmentDate || "").localeCompare(a.appointmentDate || "")
      );
      const latest = sorted[0];
      return {
        ...p,
        totalVisits,
        appointmentCount: totalVisits,
        source:
          (p as any).source ||
          (p as any).marketingSource ||
          latest?.marketingSource ||
          "Walk-in",
        subject:
          (p as any).subject ||
          (p as any).diseases ||
          latest?.diseases ||
          latest?.diagnosisNotes ||
          "",
        lastVisitDate: normalizeDateStr(
          latest?.appointmentDate || p.createdAt?.slice(0, 10) || ""
        ),
        lastDoctorName: latest?.doctorName || "",
      };
    });

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

