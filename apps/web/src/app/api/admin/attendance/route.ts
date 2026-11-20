import { NextResponse } from "next/server";
import {
  staffAttendanceService,
  employeeService,
  staffLeaveService,
  formatToIST12Hour,
} from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || undefined;
    const staffId = searchParams.get("staffId") || undefined;
    const month = searchParams.get("month") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const rawBranch = searchParams.get("branch") || undefined;
    const date = searchParams.get("date") || undefined;

    // FULL ATTENDANCE VIEW FOR A SPECIFIC EMPLOYEE
    if ((view === "full" || staffId) && staffId) {
      const fullHistory = await staffAttendanceService.getStaffFullAttendanceHistory(
        staffId,
        month || fromDate,
        toDate
      );
      return NextResponse.json({
        success: true,
        view: "full",
        ...fullHistory,
      });
    }

    const isAll = !rawBranch || rawBranch === "All Branches" || rawBranch.toLowerCase() === "all";
    const branch = isAll ? undefined : rawBranch;

    const [attendanceRecords, employees, allLeaves] = await Promise.all([
      staffAttendanceService.getAllRecords(branch, date),
      employeeService.getAllEmployees(branch),
      staffLeaveService.getAllLeaves(branch),
    ]);

    // Map existing punch records by staffId and staffName
    const punchMap = new Map<string, any>();
    attendanceRecords.forEach((att) => {
      if (att.staffId) punchMap.set(att.staffId, att);
      if (att.staffName) punchMap.set(att.staffName.toLowerCase().trim(), att);
    });

    const cleanBranch = (b: string) =>
      (b || "").toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/\s*branch$/i, "").trim();
    const branchFilter = branch ? cleanBranch(branch) : "";

    const results: any[] = [];
    const processedKeys = new Set<string>();

    // Process all active employees to ensure Report Time and attendance are available
    employees.forEach((emp) => {
      if (emp.category === "DOCTOR" && (emp as any).doctorCategory === "HEAD") return; // Skip Head doctors
      const empBranch = cleanBranch(emp.branchName || emp.branch || "");
      if (branchFilter && empBranch && !empBranch.includes(branchFilter) && !branchFilter.includes(empBranch)) {
        return;
      }

      processedKeys.add(emp.id);
      if (emp.name) processedKeys.add(emp.name.toLowerCase().trim());

      const punch = punchMap.get(emp.id) || punchMap.get((emp.name || "").toLowerCase().trim());
      const reportTime = formatToIST12Hour(emp.shiftStartTime || emp.shift1Start || "09:00 AM");
      const isMultiShift = emp.shiftType === "MULTI_STRICT";

      if (punch) {
        const resolvedPunchIn = (punch.punchInTime && punch.createdAt && !isNaN(new Date(punch.createdAt).getTime()))
          ? formatToIST12Hour(new Date(punch.createdAt))
          : (punch.punchInTime ? formatToIST12Hour(punch.punchInTime) : null);

        const resolvedPunchOut = (punch.punchOutTime && punch.updatedAt && !isNaN(new Date(punch.updatedAt).getTime()))
          ? formatToIST12Hour(new Date(punch.updatedAt))
          : (punch.punchOutTime ? formatToIST12Hour(punch.punchOutTime) : null);

        results.push({
          ...punch,
          reportTime,
          shiftStartTime: reportTime,
          shiftType: punch.shiftType || emp.shiftType || "SINGLE_STRICT",
          shiftHours: punch.shiftHours || emp.shiftHours,
          dailyHours: punch.dailyHours || emp.dailyHours,
          shift1Start: punch.shift1Start || emp.shift1Start ? formatToIST12Hour(punch.shift1Start || emp.shift1Start) : reportTime,
          shift1End: punch.shift1End || emp.shift1End ? formatToIST12Hour(punch.shift1End || emp.shift1End) : undefined,
          shift1PunchInTime: punch.shift1PunchInTime ? formatToIST12Hour(punch.shift1PunchInTime) : resolvedPunchIn,
          shift1PunchOutTime: punch.shift1PunchOutTime ? formatToIST12Hour(punch.shift1PunchOutTime) : (isMultiShift ? null : resolvedPunchOut),
          shift1PunchInPhoto: punch.shift1PunchInPhoto || (punch.punches?.find((p: any) => p.shift === "shift1" && p.type === "in")?.photo) || punch.punchInPhoto,
          shift1PunchInLocation: punch.shift1PunchInLocation || (punch.punches?.find((p: any) => p.shift === "shift1" && p.type === "in")?.location) || punch.punchInLocation,
          shift1PunchOutPhoto: punch.shift1PunchOutPhoto || (punch.punches?.find((p: any) => p.shift === "shift1" && p.type === "out")?.photo),
          shift1PunchOutLocation: punch.shift1PunchOutLocation || (punch.punches?.find((p: any) => p.shift === "shift1" && p.type === "out")?.location),
          shift2Start: punch.shift2Start || emp.shift2Start ? formatToIST12Hour(punch.shift2Start || emp.shift2Start) : (isMultiShift ? "04:30 PM" : undefined),
          shift2End: punch.shift2End || emp.shift2End ? formatToIST12Hour(punch.shift2End || emp.shift2End) : undefined,
          shift2PunchInTime: punch.shift2PunchInTime ? formatToIST12Hour(punch.shift2PunchInTime) : null,
          shift2PunchOutTime: punch.shift2PunchOutTime ? formatToIST12Hour(punch.shift2PunchOutTime) : null,
          shift2PunchInPhoto: punch.shift2PunchInPhoto || (punch.punches?.find((p: any) => p.shift === "shift2" && p.type === "in")?.photo),
          shift2PunchInLocation: punch.shift2PunchInLocation || (punch.punches?.find((p: any) => p.shift === "shift2" && p.type === "in")?.location),
          shift2PunchOutPhoto: punch.shift2PunchOutPhoto || (punch.punches?.find((p: any) => p.shift === "shift2" && p.type === "out")?.photo),
          shift2PunchOutLocation: punch.shift2PunchOutLocation || (punch.punches?.find((p: any) => p.shift === "shift2" && p.type === "out")?.location),
          punchInTime: resolvedPunchIn,
          punchOutTime: resolvedPunchOut,
          punchInPhoto: punch.punchInPhoto,
          punchOutPhoto: punch.punchOutPhoto,
          punches: punch.punches || [],
          role: emp.category === "DOCTOR" ? "Doctor" : emp.category === "HR" ? "HR Staff" : emp.category || "Staff Member",
          branch: punch.branch || emp.branchName || "KPHB Branch",
        });
      } else {
        // Check if on approved leave
        const isOnLeave = allLeaves.some((l) => {
          const matchStaff = l.staffId === emp.id || (l.staffName && l.staffName.toLowerCase() === emp.name.toLowerCase());
          if (!matchStaff || l.status === "Rejected") return false;
          if (date) {
            return l.fromDate <= date && (!l.toDate || l.toDate >= date);
          }
          return true;
        });

        results.push({
          id: `PENDING-${emp.id}-${date || "today"}`,
          staffId: emp.id,
          staffName: emp.name,
          role: emp.category === "DOCTOR" ? "Doctor" : emp.category === "HR" ? "HR Staff" : emp.category || "Staff Member",
          branch: emp.branchName || emp.branch || "KPHB Branch",
          reportTime,
          shiftStartTime: reportTime,
          shiftType: emp.shiftType || "SINGLE_STRICT",
          shiftHours: emp.shiftHours,
          dailyHours: emp.dailyHours,
          shift1Start: emp.shift1Start ? formatToIST12Hour(emp.shift1Start) : reportTime,
          shift1End: emp.shift1End ? formatToIST12Hour(emp.shift1End) : undefined,
          shift1PunchInTime: null,
          shift1PunchOutTime: null,
          shift2Start: emp.shift2Start ? formatToIST12Hour(emp.shift2Start) : (isMultiShift ? "04:30 PM" : undefined),
          shift2End: emp.shift2End ? formatToIST12Hour(emp.shift2End) : undefined,
          shift2PunchInTime: null,
          shift2PunchOutTime: null,
          punchInTime: null,
          punchOutTime: null,
          punches: [],
          workingHours: "-",
          status: isOnLeave ? "On Leave" : "Absent",
          punchInLocation: isOnLeave ? "Approved Leave" : undefined,
          date: date || new Date().toISOString().split("T")[0],
        });
      }
    });

    // Also include any attendance record that may not belong to an existing employee profile
    attendanceRecords.forEach((att) => {
      const matchId = att.staffId && processedKeys.has(att.staffId);
      const matchName = att.staffName && processedKeys.has(att.staffName.toLowerCase().trim());
      if (!matchId && !matchName) {
        const repTime = formatToIST12Hour(att.reportTime || att.shiftStartTime || "09:00 AM");
        results.push({
          ...att,
          reportTime: repTime,
          shiftStartTime: repTime,
          punchInTime: att.punchInTime ? formatToIST12Hour(att.punchInTime) : null,
          punchOutTime: att.punchOutTime ? formatToIST12Hour(att.punchOutTime) : null,
          shift1PunchInTime: att.shift1PunchInTime ? formatToIST12Hour(att.shift1PunchInTime) : null,
          shift1PunchOutTime: att.shift1PunchOutTime ? formatToIST12Hour(att.shift1PunchOutTime) : null,
          shift2PunchInTime: att.shift2PunchInTime ? formatToIST12Hour(att.shift2PunchInTime) : null,
          shift2PunchOutTime: att.shift2PunchOutTime ? formatToIST12Hour(att.shift2PunchOutTime) : null,
          punches: att.punches || [],
        });
      }
    });

    // Active staff directory for client employee selector
    const employeesList = employees
      .filter((e) => !(e.category === "DOCTOR" && (e as any).doctorCategory === "HEAD"))
      .map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        role: e.category === "DOCTOR" ? "Doctor" : e.category === "HR" ? "HR Staff" : e.category || "Staff Member",
        branch: e.branchName || e.branch || "KPHB Branch",
        shiftType: e.shiftType || "SINGLE_STRICT",
        shiftHours: e.shiftHours || (e.shiftType === "MULTI_STRICT" ? "09:00 AM - 01:00 PM & 04:30 PM - 08:30 PM" : "09:00 AM - 06:00 PM"),
        dailyHours: e.dailyHours || (e.shiftType === "MULTI_STRICT" ? "8 hrs/day" : "9 hrs/day"),
        shift1Start: e.shift1Start ? formatToIST12Hour(e.shift1Start) : "09:00 AM",
        shift2Start: e.shift2Start ? formatToIST12Hour(e.shift2Start) : "04:30 PM",
      }));

    return NextResponse.json({
      success: true,
      records: results,
      employeesList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch attendance records" }, { status: 500 });
  }
}

