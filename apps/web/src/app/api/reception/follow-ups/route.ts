import { NextRequest, NextResponse } from "next/server";
import { appointmentService, registrationSequenceService } from "@spiritualhomeo/database";

// Helper: Normalize date string to DD-MM-YYYY
function normalizeToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();

  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}-${m}-${y}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return trimmed;
}

// Convert DD-MM-YYYY to timestamp for comparison
function parseDDMMYYYYToTime(dateStr: string): number {
  const norm = normalizeToDDMMYYYY(dateStr);
  const parts = norm.split("-");
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  return 0;
}

// Convert DD-MM-YYYY to { month: 1..12, year: 2026 }
function parseMonthYear(dateStr: string): { month: number; year: number } | null {
  const norm = normalizeToDDMMYYYY(dateStr);
  const parts = norm.split("-");
  if (parts.length === 3) {
    return {
      month: parseInt(parts[1], 10),
      year: parseInt(parts[2], 10),
    };
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("search") || searchParams.get("query") || "").toLowerCase().trim();
    const branchFilter = searchParams.get("branch") || "";
    const statusFilter = searchParams.get("status") || "All";
    const periodFilter = searchParams.get("period") || "all"; // "all" | "overdue" | "this_month" | "next_month" | "due_today"
    const dateParam = searchParams.get("date") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "35", 10));
    const exportAll = searchParams.get("export") === "true";

    const all = await appointmentService.getAppointments();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

    const todayDDMMYYYY = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Filter appointments that have followUpDate or followUpInterval
    const withFollowUp = all.filter((a) => !!(a.followUpDate || a.followUpInterval));

    const branchSet = new Set<string>();

    const followUpsList = withFollowUp
      .map((a) => {
        const branchName = a.branch || "KPHB Branch";
        branchSet.add(branchName);

        const normFollowUp = normalizeToDDMMYYYY(a.followUpDate || a.appointmentDate || todayDDMMYYYY);
        const dueTime = parseDDMMYYYYToTime(normFollowUp);
        const my = parseMonthYear(normFollowUp);
        const dueMonth = my?.month || currentMonth;
        const dueYear = my?.year || currentYear;

        const isOverdue = dueTime > 0 && dueTime < todayTime && a.status !== "COMPLETED";
        const isDueToday = normFollowUp === todayDDMMYYYY;
        const isThisMonth = dueMonth === currentMonth && dueYear === currentYear;
        const isNextMonth = dueMonth === nextMonth && dueYear === nextMonthYear;

        let computedStatus: "Due Today" | "Overdue" | "Upcoming" | "Confirmed" | "Scheduled" | "Completed" = "Upcoming";
        if (a.status === "COMPLETED") {
          computedStatus = "Completed";
        } else if (isDueToday) {
          computedStatus = "Due Today";
        } else if (isOverdue) {
          computedStatus = "Overdue";
        } else if ((a.status as string) === "CONFIRMED" || a.status === "WAITING") {
          computedStatus = "Confirmed";
        } else {
          computedStatus = "Upcoming";
        }

        const interval = a.followUpInterval || "1 Month";
        const notes = a.diagnosisNotes || a.notes || a.diseases || "General follow-up consultation";

        return {
          id: a.id,
          appointmentId: a.id,
          mrn: a.registrationId || "SPH-REG",
          patientName: a.patientName || "Patient",
          phone: a.phone || "",
          doctorName: a.doctorName || "Dr. Prashanth K Vaidya",
          doctorId: a.doctorId || "1793864791241",
          branch: branchName,
          dueDate: normFollowUp,
          dueTime,
          dueMonth,
          dueYear,
          isOverdue,
          isDueToday,
          isThisMonth,
          isNextMonth,
          followUpInterval: interval,
          status: computedStatus,
          notes,
          consultationFee: a.consultationFee || 0,
          prescriptionImages: a.prescriptionImages || [],
        };
      });

    // Compute aggregate stats across all live records
    const stats = {
      total: followUpsList.length,
      overdue: followUpsList.filter((f) => f.isOverdue).length,
      dueToday: followUpsList.filter((f) => f.isDueToday).length,
      thisMonth: followUpsList.filter((f) => f.isThisMonth).length,
      nextMonth: followUpsList.filter((f) => f.isNextMonth).length,
      completed: followUpsList.filter((f) => f.status === "Completed").length,
    };

    let filtered = followUpsList;

    // Direct date match if dateParam provided
    if (dateParam && dateParam !== "ALL") {
      const targetDateNorm = normalizeToDDMMYYYY(dateParam);
      filtered = filtered.filter((f) => f.dueDate === targetDateNorm);
    } else {
      // Period / Month filter: all, overdue, this_month, next_month, due_today
      if (periodFilter === "overdue") {
        filtered = filtered.filter((f) => f.isOverdue);
      } else if (periodFilter === "this_month") {
        filtered = filtered.filter((f) => f.isThisMonth);
      } else if (periodFilter === "next_month") {
        filtered = filtered.filter((f) => f.isNextMonth);
      } else if (periodFilter === "due_today") {
        filtered = filtered.filter((f) => f.isDueToday);
      }
    }

    // Branch filter
    if (branchFilter && branchFilter !== "All Branches" && branchFilter !== "ALL") {
      filtered = filtered.filter((f) =>
        f.branch.toLowerCase().includes(branchFilter.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter && statusFilter !== "All") {
      filtered = filtered.filter((f) =>
        f.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Search query
    if (query) {
      filtered = filtered.filter(
        (f) =>
          f.patientName.toLowerCase().includes(query) ||
          f.phone.includes(query) ||
          f.mrn.toLowerCase().includes(query) ||
          f.doctorName.toLowerCase().includes(query) ||
          f.branch.toLowerCase().includes(query) ||
          f.notes.toLowerCase().includes(query)
      );
    }

    // Sort: Overdue & Due Today first, then sorted by dueTime ascending
    filtered.sort((a, b) => {
      const priority = (s: string) => {
        if (s === "Overdue") return 1;
        if (s === "Due Today") return 2;
        if (s === "Upcoming") return 3;
        if (s === "Scheduled") return 4;
        if (s === "Confirmed") return 5;
        return 6;
      };
      const pDiff = priority(a.status) - priority(b.status);
      if (pDiff !== 0) return pDiff;
      return a.dueTime - b.dueTime;
    });

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = exportAll
      ? filtered
      : filtered.slice(startIndex, startIndex + pageSize);

    const branchesList = ["All Branches", ...Array.from(branchSet).sort()];

    return NextResponse.json({
      success: true,
      followUps: paginatedItems,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
      branches: branchesList,
      stats,
      today: todayDDMMYYYY,
    });
  } catch (error: any) {
    console.error("Reception Follow-ups API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load follow-ups" },
      { status: 500 }
    );
  }
}

// PATCH: Reschedule Follow-Up Date & Details
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, newFollowUpDate, newInterval, notes } = body;

    if (!appointmentId || !newFollowUpDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (appointmentId, newFollowUpDate)" },
        { status: 400 }
      );
    }

    const normDate = normalizeToDDMMYYYY(newFollowUpDate);

    const updated = await appointmentService.updatePatientFile(appointmentId, {
      followUpDate: normDate,
      followUpInterval: newInterval || "1 Month",
      diagnosisNotes: notes,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Appointment not found to reschedule" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Follow-up rescheduled successfully",
      appointment: updated,
    });
  } catch (error: any) {
    console.error("Reception reschedule follow-up error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reschedule follow-up" },
      { status: 500 }
    );
  }
}

// POST: Book a Follow-Up Appointment Directly
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      registrationId,
      patientName,
      phoneNumber,
      emailAddress,
      branch,
      doctorId,
      doctorName,
      appointmentDate,
      selectedTimeSlot,
      consultationMode,
      diseases,
      notes,
    } = body;

    if (!patientName || !phoneNumber || !appointmentDate || !selectedTimeSlot) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (patientName, phoneNumber, appointmentDate, selectedTimeSlot)" },
        { status: 400 }
      );
    }

    const normDate = normalizeToDDMMYYYY(appointmentDate);

    const finalRegId =
      registrationId && registrationId !== "SPH-GEN"
        ? registrationId
        : await registrationSequenceService.getNextRegistrationId(branch || "KPB");

    const created = await appointmentService.createAppointment({
      registrationId: finalRegId,
      patientName: String(patientName).trim(),
      phone: String(phoneNumber).replace(/\D/g, ""),
      email: emailAddress || "",
      diseases: diseases || "Follow-up Consultation",
      marketingSource: "Follow-up Booking",
      consultationMode: consultationMode || "In-Clinic",
      doctorId: doctorId || "1793864791241",
      doctorName: doctorName || "Dr. Prashanth K Vaidya",
      appointmentDate: normDate,
      timeSlot: selectedTimeSlot,
      branch: branch || "KPHB Branch",
      isReback: true,
      notes: notes || "Booked from reception follow-up queue",
    });

    return NextResponse.json({
      success: true,
      message: "Appointment booked successfully",
      appointment: created,
    });
  } catch (error: any) {
    console.error("Reception book appointment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to book appointment" },
      { status: 500 }
    );
  }
}
