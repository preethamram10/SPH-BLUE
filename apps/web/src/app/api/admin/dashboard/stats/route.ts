import { NextResponse } from "next/server";
import {
  branchService,
  appointmentService,
  staffAttendanceService,
  staffLeaveService,
  employeeService,
} from "@spiritualhomeo/database";

export interface BranchStat {
  id: string;
  name: string;
  shortName: string;
  phone: string;
  address: string;
  timings: string;
  status: string;
  todayPatients: number;
  todayRevenue: number;
  presentStaff: number;
  leaveStaff: number;
  totalStaff: number;
}

export interface TodayAttendanceItem {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  branch: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  workingHours: string;
  status: "Present" | "Late" | "Half Day" | "Absent" | "On Leave" | "In Clinic";
  punchInLocation?: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayStr = searchParams.get("date") || `${y}-${m}-${d}`;

    // Parallel fetch from services
    const [branches, allAppointments, employees, attendanceRecords, allLeaves] =
      await Promise.all([
        branchService.getAllBranches(),
        appointmentService.getAppointments(undefined, undefined, undefined, false),
        employeeService.getAllEmployees(),
        staffAttendanceService.getAllRecords(undefined, todayStr),
        staffLeaveService.getAllLeaves(),
      ]);

    // Active branches
    const activeBranches = branches.filter((b) => b.isActive !== false);

    // Helper: clean branch name for matching (e.g. "Spiritual Homeopathy - KPHB Branch" -> "kphb")
    const cleanBranch = (name: string) => {
      return (name || "")
        .toLowerCase()
        .replace(/spiritual\s*homeopathy/gi, "")
        .replace(/branch/gi, "")
        .replace(/-/g, "")
        .trim();
    };

    const normalizeDateToYYYYMMDD = (dt?: string | null): string => {
      if (!dt) return "";
      const trimmed = dt.trim();
      if (trimmed.includes("T")) return trimmed.split("T")[0];
      const clean = trimmed.replace(/\//g, "-");
      const parts = clean.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      }
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
      return clean;
    };

    // Calculate Branch Stats
    const branchStats: BranchStat[] = activeBranches.map((branch) => {
      const bKey = cleanBranch(branch.name);

      // Appointments today for this branch
      const branchApptsToday = allAppointments.filter((a) => {
        if (a.isDeleted || a.status === "CANCELLED") return false;
        const aDate = normalizeDateToYYYYMMDD(a.appointmentDate || a.createdAt);
        const aPaidDate = a.paidAt ? normalizeDateToYYYYMMDD(a.paidAt) : "";
        const aBranchKey = cleanBranch(a.branch || "");
        const matchBranch =
          !bKey || aBranchKey.includes(bKey) || bKey.includes(aBranchKey);
        const matchDate = aDate === todayStr || aPaidDate === todayStr;
        return matchBranch && matchDate;
      });

      const todayPatients = branchApptsToday.length;

      // Revenue today for this branch
      const todayRevenue = branchApptsToday.reduce((sum, a) => {
        const isPaid =
          a.isFeeCollected ||
          a.status === "COMPLETED" ||
          Boolean(a.paidAt) ||
          (typeof a.totalPaid === "number" && a.totalPaid > 0) ||
          (typeof a.totalAmountDue === "number" && a.totalAmountDue > 0);
        if (!isPaid) return sum;

        let total = 0;
        if (typeof a.totalPaid === "number" && a.totalPaid > 0) {
          total = a.totalPaid;
        } else if (typeof a.totalAmountDue === "number" && a.totalAmountDue > 0) {
          total = a.totalAmountDue;
        } else {
          const cFee = Number(a.consultationFee) || 0;
          const mFee = Number(a.medicineFee) || 0;
          const dFee = Number(a.dietPlanFee) || 0;
          total = cFee + mFee + dFee || 500;
        }
        return sum + total;
      }, 0);

      // Staff assigned to this branch
      const branchStaff = employees.filter((e) => {
        if (e.category === "DOCTOR") return false; // Doctors are multi-branch or head
        const eBranch = cleanBranch(e.branchName || "");
        return eBranch.includes(bKey) || bKey.includes(eBranch);
      });

      // Present staff today in this branch
      const presentStaffCount = attendanceRecords.filter((att) => {
        const attBranch = cleanBranch(att.branch || "");
        return (
          (attBranch.includes(bKey) || bKey.includes(attBranch)) &&
          att.punchInTime &&
          att.status !== "Absent"
        );
      }).length;

      // Leaves today in this branch
      const leaveStaffCount = allLeaves.filter((l) => {
        const lBranch = cleanBranch(l.branch || "");
        const matchesBranch = lBranch.includes(bKey) || bKey.includes(lBranch);
        const isOnLeaveToday =
          l.fromDate <= todayStr && (!l.toDate || l.toDate >= todayStr);
        return matchesBranch && isOnLeaveToday && l.status !== "Rejected";
      }).length;

      const shortName =
        branch.name
          .replace(/Spiritual Homeopathy/gi, "")
          .replace(/Branch/gi, "")
          .replace(/Clinic/gi, "")
          .replace(/-/g, "")
          .trim() || branch.name;

      return {
        id: branch.id,
        name: branch.name,
        shortName,
        phone: branch.phone,
        address: branch.address,
        timings: branch.timings || "9:00 AM - 8:30 PM",
        status: branch.isActive !== false ? "Active" : "Inactive",
        todayPatients,
        todayRevenue,
        presentStaff: presentStaffCount,
        leaveStaff: leaveStaffCount,
        totalStaff: branchStaff.length,
      };
    });

    // Summary aggregates
    const totalTodayPatients = branchStats.reduce((s, b) => s + b.todayPatients, 0);
    const totalTodayRevenue = branchStats.reduce((s, b) => s + b.todayRevenue, 0);
    const totalPresentStaff = attendanceRecords.filter(
      (a) => a.punchInTime && a.status !== "Absent"
    ).length;
    const totalLeaveStaff = allLeaves.filter(
      (l) =>
        l.fromDate <= todayStr &&
        (!l.toDate || l.toDate >= todayStr) &&
        l.status !== "Rejected"
    ).length;

    // Today's All Branches Staff Punch In & Out Records
    const attendanceItems: TodayAttendanceItem[] = [];

    // Map existing attendance punch records
    attendanceRecords.forEach((att) => {
      const emp = employees.find((e) => e.id === att.staffId || e.name === att.staffName);
      let role = emp ? emp.category : "Staff";
      if (role === "STAFF") role = "Staff Member";
      if (role === "DOCTOR") role = "Doctor";

      let statusDisplay: TodayAttendanceItem["status"] = att.status || "Present";
      if (att.punchInTime && !att.punchOutTime) {
        statusDisplay = "In Clinic";
      }

      attendanceItems.push({
        id: att.id || `ATT-${att.staffId}`,
        staffId: att.staffId,
        staffName: att.staffName,
        role,
        branch: att.branch || emp?.branchName || "KPHB Branch",
        punchInTime: att.punchInTime || null,
        punchOutTime: att.punchOutTime || null,
        workingHours: att.workingHours || (att.punchInTime && !att.punchOutTime ? "In Clinic" : "-"),
        status: statusDisplay,
        punchInLocation: att.punchInLocation || "Clinic Biometric",
      });
    });

    // Check staff on leave who didn't punch in
    allLeaves.forEach((l) => {
      const isOnLeaveToday =
        l.fromDate <= todayStr && (!l.toDate || l.toDate >= todayStr);
      if (isOnLeaveToday && l.status !== "Rejected") {
        const alreadyListed = attendanceItems.some((item) => item.staffId === l.staffId);
        if (!alreadyListed) {
          const emp = employees.find((e) => e.id === l.staffId || e.name === l.staffName);
          attendanceItems.push({
            id: `LEAVE-${l.id || l.staffId}`,
            staffId: l.staffId,
            staffName: l.staffName,
            role: emp?.category || "Staff Member",
            branch: l.branch || emp?.branchName || "KPHB Branch",
            punchInTime: null,
            punchOutTime: null,
            workingHours: "-",
            status: "On Leave",
            punchInLocation: `Approved Leave (${l.leaveType})`,
          });
        }
      }
    });

    // Add any staff members who haven't punched in yet today
    employees.forEach((emp) => {
      if (emp.category === "DOCTOR" && emp.doctorCategory === "HEAD") return; // Skip Head doctors from strict attendance
      const alreadyListed = attendanceItems.some(
        (item) => item.staffId === emp.id || item.staffName === emp.name
      );
      if (!alreadyListed) {
        attendanceItems.push({
          id: `PENDING-${emp.id}`,
          staffId: emp.id,
          staffName: emp.name,
          role: emp.category === "DOCTOR" ? "Doctor" : emp.category === "HR" ? "HR Staff" : "Staff Member",
          branch: emp.branchName || "KPHB Branch",
          punchInTime: null,
          punchOutTime: null,
          workingHours: "-",
          status: "Absent",
          punchInLocation: "Not Punched In Yet",
        });
      }
    });

    return NextResponse.json({
      success: true,
      todayStr,
      summary: {
        totalBranches: activeBranches.length,
        totalTodayPatients,
        totalTodayRevenue,
        totalPresentStaff,
        totalLeaveStaff,
        totalDoctors: employees.filter((e) => e.category === "DOCTOR").length,
      },
      branchStats,
      todayAttendance: attendanceItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
