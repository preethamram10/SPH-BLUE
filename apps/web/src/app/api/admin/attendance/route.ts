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
    const rawBranch = searchParams.get("branch") || undefined;
    const date = searchParams.get("date") || undefined;

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
      const reportTime = formatToIST12Hour(emp.shiftStartTime || "09:00 AM");

      if (punch) {
        results.push({
          ...punch,
          reportTime,
          shiftStartTime: reportTime,
          punchInTime: punch.punchInTime ? formatToIST12Hour(punch.punchInTime) : null,
          punchOutTime: punch.punchOutTime ? formatToIST12Hour(punch.punchOutTime) : null,
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
          punchInTime: null,
          punchOutTime: null,
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
        });
      }
    });

    return NextResponse.json({ success: true, records: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch attendance records" }, { status: 500 });
  }
}

