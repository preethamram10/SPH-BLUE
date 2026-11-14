import { NextRequest, NextResponse } from "next/server";
import { appointmentService, patientService, normalizeDateStr } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

/**
 * Returns the current date in Indian Standard Time (IST, UTC+5:30) as YYYY-MM-DD
 */
function getISTDateStr(offsetDays = 0): string {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMillis = utcMillis + 330 * 60000;
  const istDate = new Date(istMillis);
  if (offsetDays !== 0) {
    istDate.setDate(istDate.getDate() + offsetDays);
  }
  const y = istDate.getFullYear();
  const m = String(istDate.getMonth() + 1).padStart(2, "0");
  const d = String(istDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawDoc = searchParams.get("doctorName") || searchParams.get("doctorId");

    // Strict doctor scoping guard:
    // If doctorName is missing or empty, do NOT leak all patients across the clinic.
    // Return empty list unless caller explicitly requested "ALL" or "All Doctors" (e.g. Admin portal).
    const isAllDocs = rawDoc === "ALL" || rawDoc === "All Doctors" || rawDoc?.toLowerCase() === "all";
    if (!rawDoc || rawDoc.trim() === "") {
      return NextResponse.json({
        success: true,
        patients: [],
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        sessionCounts: { TODAY: 0, YESTERDAY: 0, TREATED: 0, ALL: 0 },
      });
    }
    const doctorName = isAllDocs ? undefined : rawDoc.trim();

    const rawBranch = searchParams.get("branch");
    const isAllBranches = !rawBranch || rawBranch === "ALL" || rawBranch === "All Branches" || rawBranch.toLowerCase() === "all";
    const branch = isAllBranches ? undefined : rawBranch;

    const session = (searchParams.get("session") || "ALL").toUpperCase(); // TODAY | YESTERDAY | TREATED | ALL
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const todayIST = getISTDateStr(0);
    const yesterdayIST = getISTDateStr(-1);

    // Determine date filter for session
    let dateFilter: string | undefined;
    if (session === "TODAY") {
      dateFilter = todayIST;
    } else if (session === "YESTERDAY") {
      dateFilter = yesterdayIST;
    }

    // Fetch appointments matching criteria
    const appointments = await appointmentService.getAppointments(branch, dateFilter, doctorName);

    // Group appointments by unique patient identity
    const patientMap = new Map<string, any>();

    appointments.forEach((a) => {
      const normDate = normalizeDateStr(a.appointmentDate);
      const cleanPhone = (a.phone || "").replace(/\D/g, "").slice(-10);
      const cleanReg = (a.registrationId && a.registrationId !== "SPH-GEN") ? a.registrationId.trim() : "";
      
      const key = cleanReg || (cleanPhone ? `PHONE_${cleanPhone}` : `NAME_${(a.patientName || "").trim().toLowerCase()}`);
      if (!key) return;

      const statusStr = String(a.status || "");
      const isTreated =
        statusStr === "COMPLETED" ||
        statusStr === "COLLECT_FEE" ||
        statusStr === "IN_CONSULTATION" ||
        statusStr === "DISPATCHED" ||
        statusStr === "MEDICINE_DISPENSED" ||
        !!a.diagnosisNotes ||
        !!a.prescriptionText ||
        (Array.isArray(a.prescriptionImages) && a.prescriptionImages.length > 0);

      if (!patientMap.has(key)) {
        patientMap.set(key, {
          id: cleanReg || a.id,
          registrationId: cleanReg || (cleanPhone ? `SPH-${cleanPhone.slice(-4)}` : a.id),
          name: a.patientName || "Unknown",
          patientName: a.patientName || "Unknown",
          phone: cleanPhone || a.phone || "",
          diseases: a.diseases || a.diagnosisNotes || "General Consultation",
          subject: a.diseases || a.diagnosisNotes || "General Consultation",
          source: a.marketingSource || "Walk-in",
          lastVisitDate: normDate,
          lastSlot: a.timeSlot,
          status: a.status,
          consultationMode: a.consultationMode || "Offline",
          totalVisits: 1,
          treatedVisits: isTreated ? 1 : 0,
          isTreated,
          branch: a.branch,
          doctorName: a.doctorName,
        });
      } else {
        const existing = patientMap.get(key);
        existing.totalVisits += 1;
        if (isTreated) {
          existing.treatedVisits = (existing.treatedVisits || 0) + 1;
          existing.isTreated = true;
        }
        if ((!existing.diseases || existing.diseases === "General Consultation") && (a.diseases || a.diagnosisNotes)) {
          existing.diseases = a.diseases || a.diagnosisNotes;
          existing.subject = existing.diseases;
        }
        // Keep track of latest visit date
        if (!existing.lastVisitDate || normDate >= existing.lastVisitDate) {
          existing.lastVisitDate = normDate;
          existing.lastSlot = a.timeSlot;
          existing.status = a.status;
          existing.branch = a.branch || existing.branch;
          existing.doctorName = a.doctorName || existing.doctorName;
          if (a.consultationMode) existing.consultationMode = a.consultationMode;
        }
      }
    });

    // If session is ALL or TREATED, also integrate patients from patientService registry
    if (session === "ALL" || session === "TREATED") {
      try {
        const registered = await patientService.getAllPatients(branch);
        registered.forEach((p) => {
          const cleanPhone = (p.phone || "").replace(/\D/g, "").slice(-10);
          const cleanReg = p.regId ? p.regId.trim() : "";
          const key = cleanReg || (cleanPhone ? `PHONE_${cleanPhone}` : `NAME_${(p.name || "").trim().toLowerCase()}`);
          if (!key) return;

          const isTreated = (p.completedVisitsCount || 0) > 0 || !!p.hasPackage;

          if (patientMap.has(key)) {
            const existing = patientMap.get(key);
            if (cleanReg && (!existing.registrationId || existing.registrationId.startsWith("SPH-"))) {
              existing.registrationId = cleanReg;
              existing.id = cleanReg;
            }
            if (p.completedVisitsCount && p.completedVisitsCount > existing.totalVisits) {
              existing.totalVisits = p.completedVisitsCount;
            }
            if (isTreated) existing.isTreated = true;
          } else if (session === "ALL" || (session === "TREATED" && isTreated)) {
            patientMap.set(key, {
              id: cleanReg || p.id,
              registrationId: cleanReg || (cleanPhone ? `SPH-${cleanPhone.slice(-4)}` : p.id),
              name: p.name || "Unknown",
              patientName: p.name || "Unknown",
              phone: cleanPhone || p.phone || "",
              diseases: p.diseases || "General Consultation",
              subject: p.diseases || "General Consultation",
              source: "Walk-in",
              lastVisitDate: normalizeDateStr(p.createdAt?.slice(0, 10)),
              lastSlot: "",
              status: isTreated ? "COMPLETED" : "BOOKED",
              consultationMode: "Offline",
              totalVisits: p.completedVisitsCount || 1,
              treatedVisits: p.completedVisitsCount || (isTreated ? 1 : 0),
              isTreated,
              branch: p.branch || branch || "",
              doctorName: doctorName || "",
            });
          }
        });
      } catch (err) {
        console.warn("Error augmenting from patientService:", err);
      }
    }

    let patients = Array.from(patientMap.values());

    // Filter for TREATED tab if explicitly requested
    if (session === "TREATED") {
      patients = patients.filter(
        (p) =>
          p.isTreated ||
          (p.treatedVisits && p.treatedVisits > 0) ||
          p.status === "COMPLETED" ||
          p.status === "COLLECT_FEE" ||
          p.status === "IN_CONSULTATION"
      );
    }

    // Sort newest visit date first
    patients = patients.sort((a, b) =>
      (b.lastVisitDate || "").localeCompare(a.lastVisitDate || "")
    );

    const totalCount = patients.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paged = patients.slice(start, start + pageSize);

    return NextResponse.json({
      success: true,
      patients: paged,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
      session,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
