import { NextRequest, NextResponse } from "next/server";
import { patientService, appointmentService, branchService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("search") || "").trim().toLowerCase();
    const branchFilter = (searchParams.get("branch") || "").trim();
    const exportAll = searchParams.get("export") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));

    // 1. Fetch real patients and appointments from database
    const [rawPatients, rawAppointments, rawBranches] = await Promise.all([
      patientService.getAllPatients(),
      appointmentService.getAppointments(undefined, undefined, undefined, false),
      branchService.getAllBranches(),
    ]);

    // Build branch names set
    const branchSet = new Set<string>();
    rawBranches.forEach((b) => {
      if (b.name) branchSet.add(b.name);
    });

    // 2. Index appointments by registrationId and phone
    const apptsByRegId = new Map<string, any[]>();
    const apptsByPhone = new Map<string, any[]>();

    rawAppointments.forEach((a) => {
      if (a.isDeleted || a.status === "CANCELLED") return;

      const reg = String(a.registrationId || "").trim().toUpperCase();
      if (reg) {
        if (!apptsByRegId.has(reg)) apptsByRegId.set(reg, []);
        apptsByRegId.get(reg)!.push(a);
      }

      const ph = String(a.phone || "").replace(/\D/g, "").slice(-10);
      if (ph) {
        if (!apptsByPhone.has(ph)) apptsByPhone.set(ph, []);
        apptsByPhone.get(ph)!.push(a);
      }
    });

    // 3. Aggregate unique patients map
    const patientMap = new Map<string, any>();

    // Add registered patients
    rawPatients.forEach((p) => {
      const reg = String(p.regId || "").trim().toUpperCase() || `SPH-${p.id}`;
      const phoneDigits = String(p.phone || "").replace(/\D/g, "").slice(-10);

      const matchedAppts =
        apptsByRegId.get(reg) || (phoneDigits ? apptsByPhone.get(phoneDigits) : []) || [];
      const sortedAppts = [...matchedAppts].sort((a, b) =>
        String(b.appointmentDate || "").localeCompare(String(a.appointmentDate || ""))
      );
      const latest = sortedAppts[0];

      const rawB = String(p.branch || latest?.branch || "Kphb Branch");
      const normB = rawB.toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/\bbranch\b/gi, "").replace(/[^a-z0-9]/g, "").trim();
      const matchedB = rawBranches.find((rb) => {
        const normRb = (rb.name || "").toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/\bbranch\b/gi, "").replace(/[^a-z0-9]/g, "").trim();
        return normRb === normB || (normRb.length >= 3 && normB.length >= 3 && (normRb.startsWith(normB) || normB.startsWith(normRb)));
      });
      const cleanBranch = matchedB ? matchedB.name : rawB;

      patientMap.set(reg, {
        id: String(p.id || reg),
        mrn: reg,
        name: String(p.name || latest?.patientName || "Patient"),
        phone: String(p.phone || latest?.phone || "N/A"),
        ageGender:
          (p as any).ageGender ||
          ((latest as any)?.age ? `${(latest as any).age} / ${(latest as any).gender || "General"}` : "General"),
        registeredBranch: cleanBranch,
        lastDoctor: String(latest?.doctorName || "Dr. Prashanth K Vaidya"),
        totalVisits: Math.max(matchedAppts.length, 1),
        lastVisitDate: String(latest?.appointmentDate || p.createdAt?.slice(0, 10) || "Recent"),
        condition: String(p.diseases || latest?.diseases || latest?.diagnosisNotes || "Homeopathy Care"),
        email: String(p.email || latest?.email || ""),
      });
    });

    // Also include any patients from appointments that didn't have a separate patientRecord entry
    rawAppointments.forEach((a) => {
      if (a.isDeleted || a.status === "CANCELLED") return;
      const reg = String(a.registrationId || "").trim().toUpperCase();
      const phoneDigits = String(a.phone || "").replace(/\D/g, "").slice(-10);
      const key = reg || (phoneDigits ? `PH-${phoneDigits}` : String(a.id));

      if (!patientMap.has(reg) && !patientMap.has(key)) {
        const matchedAppts =
          (reg ? apptsByRegId.get(reg) : null) ||
          (phoneDigits ? apptsByPhone.get(phoneDigits) : null) || [a];
        const sortedAppts = [...matchedAppts].sort((x, y) =>
          String(y.appointmentDate || "").localeCompare(String(x.appointmentDate || ""))
        );
        const latest = sortedAppts[0] || a;

        const rawB = String(a.branch || "Kphb Branch");
        const normB = rawB.toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/\bbranch\b/gi, "").replace(/[^a-z0-9]/g, "").trim();
        const matchedB = rawBranches.find((rb) => {
          const normRb = (rb.name || "").toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/\bbranch\b/gi, "").replace(/[^a-z0-9]/g, "").trim();
          return normRb === normB || (normRb.length >= 3 && normB.length >= 3 && (normRb.startsWith(normB) || normB.startsWith(normRb)));
        });
        const cleanBranch = matchedB ? matchedB.name : rawB;

        patientMap.set(key, {
          id: String(a.id || key),
          mrn: reg || `SPH-${String(a.token || a.id).slice(-5).toUpperCase()}`,
          name: String(a.patientName || "Patient"),
          phone: String(a.phone || "N/A"),
          ageGender: "General",
          registeredBranch: cleanBranch,
          lastDoctor: String(latest.doctorName || "Dr. Prashanth K Vaidya"),
          totalVisits: matchedAppts.length,
          lastVisitDate: String(latest.appointmentDate || "Recent"),
          condition: String(a.diseases || a.diagnosisNotes || "General Consultation"),
          email: String(a.email || ""),
        });
      }
    });

    let allPatients = Array.from(patientMap.values());

    // Sort by lastVisitDate descending
    allPatients.sort((a, b) => String(b.lastVisitDate || "").localeCompare(String(a.lastVisitDate || "")));

    // Apply filtering if provided in query
    if (branchFilter && branchFilter !== "All Branches") {
      allPatients = allPatients.filter((p) =>
        String(p.registeredBranch).toLowerCase().includes(branchFilter.toLowerCase())
      );
    }

    if (query) {
      allPatients = allPatients.filter(
        (p) =>
          String(p.name).toLowerCase().includes(query) ||
          String(p.phone).includes(query) ||
          String(p.mrn).toLowerCase().includes(query) ||
          String(p.condition).toLowerCase().includes(query) ||
          String(p.lastDoctor).toLowerCase().includes(query)
      );
    }

    const branchesList = ["All Branches", ...Array.from(new Set(rawBranches.map((b) => b.name).filter(Boolean)))];

    const totalCount = allPatients.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedPatients = exportAll
      ? allPatients
      : allPatients.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      success: true,
      patients: paginatedPatients,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
      branches: branchesList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load global patients" },
      { status: 500 }
    );
  }
}

