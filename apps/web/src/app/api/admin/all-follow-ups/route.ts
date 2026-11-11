import { NextRequest, NextResponse } from "next/server";
import { appointmentService, branchService, registrationSequenceService } from "@spiritualhomeo/database";

// Normalize date to DD-MM-YYYY
function normalizeToDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return "";
  const clean = dateStr.replace(/\//g, "-").trim();

  // If DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) return clean;

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-");
    return `${d}-${m}-${y}`;
  }

  // Parse standard Date
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return clean;
}

// Convert DD-MM-YYYY to timestamp
function parseDDMMYYYYToTime(dateStr?: string): number {
  if (!dateStr) return 0;
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = String(searchParams.get("search") || "").trim().toLowerCase();
    const branchFilter = String(searchParams.get("branch") || "").trim();
    const statusFilter = String(searchParams.get("status") || "").trim();
    const periodFilter = String(searchParams.get("period") || "all").trim().toLowerCase(); // all, overdue, this_month, next_month, due_today, month, range
    const selectedMonth = String(searchParams.get("selectedMonth") || "").trim(); // YYYY-MM
    const startDate = String(searchParams.get("startDate") || "").trim();
    const endDate = String(searchParams.get("endDate") || "").trim();
    const exportAll = searchParams.get("export") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "35", 10)));

    const [allAppts, rawBranches] = await Promise.all([
      appointmentService.getAppointments(undefined, undefined, undefined, false),
      branchService.getAllBranches(),
    ]);

    // Build branch options
    const branchSet = new Set<string>();
    rawBranches.forEach((b) => {
      if (b.name) branchSet.add(b.name);
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (e.g. 10 for November)
    const nextMonth = (currentMonth + 1) % 12;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    const todayDDMMYYYY = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${currentYear}`;
    const todayTime = new Date(currentYear, currentMonth, now.getDate()).getTime();

    // Map all appointments into follow-up records
    const followUpsList = allAppts
      .filter((a) => !a.isDeleted && a.status !== "CANCELLED")
      .map((a, idx) => {
        const cleanBranch = String(a.branch || "KPHB Branch");
        branchSet.add(cleanBranch);

        let dueDate = "";
        let interval = String(a.followUpInterval || "1 Month");

        if (a.followUpDate) {
          dueDate = normalizeToDDMMYYYY(a.followUpDate);
        } else if (a.appointmentDate) {
          // Project 30 days after appointment if not explicitly scheduled
          const normAppt = normalizeToDDMMYYYY(a.appointmentDate);
          const parts = normAppt.split("-");
          if (parts.length === 3) {
            const apptDateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            const projected = new Date(apptDateObj.getTime() + 30 * 86400000);
            dueDate = `${String(projected.getDate()).padStart(2, "0")}-${String(projected.getMonth() + 1).padStart(2, "0")}-${projected.getFullYear()}`;
          } else {
            dueDate = normAppt;
          }
        } else {
          dueDate = todayDDMMYYYY;
        }

        const dueTime = parseDDMMYYYYToTime(dueDate);

        // Date breakdown for month filtering
        const parts = dueDate.split("-");
        let dueMonth = -1;
        let dueYear = -1;
        if (parts.length === 3) {
          dueMonth = parseInt(parts[1], 10) - 1;
          dueYear = parseInt(parts[2], 10);
        }

        // Determine follow-up status (Overdue = passes the follow-up date)
        let computedStatus: "Due Today" | "Overdue" | "Upcoming" | "Confirmed" | "Scheduled" | "Completed" = "Upcoming";

        const isOverdue = dueTime > 0 && dueTime < todayTime && a.status !== "COMPLETED";
        const isDueToday = dueDate === todayDDMMYYYY || dueTime === todayTime;
        const isThisMonth = dueYear === currentYear && dueMonth === currentMonth;
        const isNextMonth = dueYear === nextMonthYear && dueMonth === nextMonth;

        if (a.status === "COMPLETED" && dueTime < todayTime) {
          computedStatus = "Completed";
        } else if (isDueToday) {
          computedStatus = "Due Today";
        } else if (isOverdue) {
          computedStatus = "Overdue";
        } else if ((a.status as string) === "CONFIRMED" || a.status === "WAITING") {
          computedStatus = "Confirmed";
        } else if (dueTime > todayTime) {
          computedStatus = "Upcoming";
        } else {
          computedStatus = "Scheduled";
        }

        const mrn = String(a.registrationId || `SPH-${String(a.token || a.id).slice(-5).toUpperCase()}`);
        const notes = String(a.diagnosisNotes || a.notes || a.diseases || "Routine chronic homeopathic review");

        return {
          id: String(a.id || `FU-${idx + 1}`),
          appointmentId: String(a.id),
          mrn,
          patientName: String(a.patientName || "Patient"),
          phone: String(a.phone || "N/A"),
          doctorName: String(a.doctorName || "Dr. Prashanth K Vaidya"),
          doctorId: String(a.doctorId || "doc-1"),
          branch: cleanBranch,
          dueDate,
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

    // Filter
    let filtered = followUpsList;

    // Period / Month / Range filter: all, overdue, this_month, next_month, due_today, month, range
    if (periodFilter === "overdue") {
      filtered = filtered.filter((f) => f.isOverdue);
    } else if (periodFilter === "this_month") {
      filtered = filtered.filter((f) => f.isThisMonth);
    } else if (periodFilter === "next_month") {
      filtered = filtered.filter((f) => f.isNextMonth);
    } else if (periodFilter === "due_today") {
      filtered = filtered.filter((f) => f.isDueToday);
    } else if (periodFilter === "month" && selectedMonth) {
      const [sYear, sMonth] = selectedMonth.split("-").map(Number);
      filtered = filtered.filter(
        (f) => f.dueYear === sYear && f.dueMonth === sMonth - 1
      );
    } else if (periodFilter === "range" || (startDate && endDate)) {
      const startTime = startDate ? parseDDMMYYYYToTime(startDate) : 0;
      const endTime = endDate ? parseDDMMYYYYToTime(endDate) + 86399999 : Infinity;
      filtered = filtered.filter((f) => f.dueTime >= startTime && f.dueTime <= endTime);
    }

    // Branch filter
    if (branchFilter && branchFilter !== "All Branches") {
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

    // Query search
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
    });
  } catch (error: any) {
    console.error("All Follow-Ups API error:", error);
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
    console.error("Reschedule follow-up error:", error);
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
      bookedByTelecallerId,
      bookedByTelecallerName,
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
      notes: notes || "Booked from follow-up queue",
      bookedByTelecallerId: bookedByTelecallerId || undefined,
      bookedByTelecallerName: bookedByTelecallerName || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment booked successfully",
      appointment: created,
    });
  } catch (error: any) {
    console.error("Book appointment from follow-up error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to book appointment" },
      { status: 500 }
    );
  }
}
