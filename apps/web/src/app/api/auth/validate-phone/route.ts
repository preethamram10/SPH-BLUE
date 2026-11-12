import { NextRequest, NextResponse } from "next/server";
import {
  branchService,
  doctorScheduleService,
  employeeService,
  normalizePhone,
  prisma,
} from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, role } = body;

    if (!phone) {
      return NextResponse.json(
        { authorized: false, error: "Phone number is required." },
        { status: 400 }
      );
    }

    const cleanInput = normalizePhone(phone);
    if (cleanInput.length < 10) {
      return NextResponse.json(
        { authorized: false, error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    const clean10 = cleanInput.slice(-10);
    const requestedRole = (role || "").toUpperCase();

    // 1. Look up across all data sources
    // A. Check Branches (Reception)
    const branches = await branchService.getAllBranches();
    const matchedBranch = branches.find((b) => {
      const bp = normalizePhone(b.phone || "").slice(-10);
      return bp === clean10;
    });

    // B. Check Doctor Schedules
    const schedules = await doctorScheduleService.getAllSchedules();
    const matchedSchedule = schedules.find((s) => {
      const sp = normalizePhone(s.phone || "").slice(-10);
      return sp === clean10;
    });

    // C. Check Employee Directory
    const employees = await employeeService.getAllEmployees();
    const matchedEmployee = employees.find((e) => {
      const ep = normalizePhone(e.phone || "").slice(-10);
      return ep === clean10;
    });

    // D. Check Prisma Database User (if DB active)
    let dbUser: any = null;
    try {
      dbUser = await prisma.user.findFirst({
        where: {
          phone: { contains: clean10 },
        },
      });
    } catch {}

    // Determine actual roles
    const isDoctor =
      !!matchedSchedule ||
      matchedEmployee?.category === "DOCTOR" ||
      dbUser?.role === "DOCTOR";

    const isReception =
      !!matchedBranch ||
      matchedEmployee?.category === "RECEPTION" ||
      dbUser?.role === "RECEPTION";

    const isTelecaller =
      matchedEmployee?.category === "TELECALLER" ||
      matchedEmployee?.category === "STAFF" ||
      dbUser?.role === "TELECALLER" ||
      dbUser?.role === "STAFF";

    const isAdminOrHr =
      matchedEmployee?.category === "ADMIN" ||
      matchedEmployee?.category === "HR" ||
      dbUser?.role === "ADMIN" ||
      dbUser?.role === "HR";

    // ----------------------------------------------------
    // CASE 1: DOCTOR LOGIN REQUESTED
    // ----------------------------------------------------
    if (requestedRole === "DOCTOR") {
      if (isReception) {
        const branchName = matchedBranch?.name || matchedEmployee?.branchName || "Reception";
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} belongs to ${branchName} (Reception), not Doctor. Please select the Reception tab to log in.`,
          },
          { status: 403 }
        );
      }

      if (isTelecaller) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} is registered as Telecaller/Staff, not Doctor.`,
          },
          { status: 403 }
        );
      }

      if (isAdminOrHr) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} is registered as Admin/HR, not Doctor. Please use the Admin/HR tab.`,
          },
          { status: 403 }
        );
      }

      if (!isDoctor) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} is not registered as a Doctor in the clinic system. Please contact clinic administration.`,
          },
          { status: 403 }
        );
      }

      // Valid Doctor
      const docName =
        matchedSchedule?.doctorName ||
        matchedEmployee?.name ||
        dbUser?.name ||
        "Doctor";
      const docId =
        matchedSchedule?.doctorId ||
        matchedSchedule?.id ||
        matchedEmployee?.id ||
        dbUser?.id ||
        `doc-${clean10}`;
      const specialty =
        matchedSchedule?.specialty || "Consultant Homeopath";
      const branchName =
        matchedEmployee?.branchName || "KPHB Branch";

      const isHead =
        matchedEmployee?.doctorCategory === "HEAD" ||
        matchedEmployee?.category === "HEAD" ||
        (matchedSchedule?.specialty || "").toLowerCase().includes("head") ||
        (matchedSchedule?.specialty || "").toLowerCase().includes("chief") ||
        (matchedSchedule as any)?.doctorCategory === "HEAD" ||
        dbUser?.role === "HEAD_DOCTOR" ||
        dbUser?.doctorCategory === "HEAD" ||
        docName.toLowerCase().includes("prashanth") ||
        docName.toLowerCase().includes("head") ||
        docName.toLowerCase().includes("vaidya") ||
        docName.toLowerCase().includes("chief");

      const doctorCategory = isHead ? "HEAD" : (matchedEmployee?.doctorCategory || "EMPLOYEE");

      return NextResponse.json({
        authorized: true,
        role: "DOCTOR",
        doctor: {
          id: docId,
          name: docName,
          phone: matchedSchedule?.phone || matchedEmployee?.phone || clean10,
          specialty,
          branch: branchName,
          doctorCategory,
          isHeadDoctor: isHead,
        },
      });
    }

    // ----------------------------------------------------
    // CASE 2: RECEPTION LOGIN REQUESTED
    // ----------------------------------------------------
    if (requestedRole === "RECEPTION") {
      if (isDoctor) {
        const docName = matchedSchedule?.doctorName || matchedEmployee?.name || "Doctor";
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} belongs to ${docName} (Doctor), not Reception. Please select the Doctor tab to log in.`,
          },
          { status: 403 }
        );
      }

      if (isTelecaller) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} is registered as Telecaller/Staff, not Reception.`,
          },
          { status: 403 }
        );
      }

      if (isAdminOrHr) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} is registered as Admin/HR, not Reception.`,
          },
          { status: 403 }
        );
      }

      if (!isReception) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} is not registered with any clinic branch or receptionist. Only registered branch contact numbers can log in as Reception.`,
          },
          { status: 403 }
        );
      }

      // Valid Reception
      const branchData = matchedBranch || {
        id: matchedEmployee?.branchId || `b-${clean10}`,
        name: matchedEmployee?.branchName || "Clinic Branch",
        phone: matchedEmployee?.phone || clean10,
        address: "",
      };

      return NextResponse.json({
        authorized: true,
        role: "RECEPTION",
        branch: {
          id: branchData.id,
          name: branchData.name,
          phone: branchData.phone,
          address: branchData.address || "",
        },
      });
    }

    // ----------------------------------------------------
    // CASE 3: TELECALLER LOGIN REQUESTED
    // ----------------------------------------------------
    if (requestedRole === "TELECALLER") {
      if (isDoctor) {
        const docName = matchedSchedule?.doctorName || matchedEmployee?.name || "Doctor";
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} belongs to ${docName} (Doctor), not Telecaller. Please select the Doctor tab.`,
          },
          { status: 403 }
        );
      }

      if (isReception) {
        const branchName = matchedBranch?.name || matchedEmployee?.branchName || "Reception";
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} belongs to ${branchName} (Reception), not Telecaller.`,
          },
          { status: 403 }
        );
      }

      if (!isTelecaller) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} is not registered for telecalling or staff access.`,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        authorized: true,
        role: "TELECALLER",
        user: {
          id: matchedEmployee?.id || dbUser?.id || `tc-${clean10}`,
          name: matchedEmployee?.name || dbUser?.name || "Telecaller Staff",
          phone: matchedEmployee?.phone || clean10,
          branch: matchedEmployee?.branchName || "Main Branch",
        },
      });
    }

    // ----------------------------------------------------
    // CASE 3B: STAFF LOGIN REQUESTED
    // ----------------------------------------------------
    if (requestedRole === "STAFF") {
      const isStaffUser =
        matchedEmployee?.category === "STAFF" ||
        matchedEmployee?.category === "RECEPTION" ||
        matchedEmployee?.category === "TELECALLER" ||
        dbUser?.role === "STAFF";

      if (!isStaffUser) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Denied: Mobile number ${clean10} is not registered as a Staff member in the clinic system.`,
          },
          { status: 403 }
        );
      }

      if (matchedEmployee && matchedEmployee.isAccessGranted === false) {
        return NextResponse.json(
          {
            authorized: false,
            error: `Access Not Granted: Staff login has not been activated by HR or Admin yet. Please contact your Branch HR/Admin to give you access.`,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        authorized: true,
        role: "STAFF",
        user: {
          id: matchedEmployee?.id || `staff-${clean10}`,
          name: matchedEmployee?.name || "Staff Member",
          branch: matchedEmployee?.branchName || "KPHB Branch",
          shiftStartTime: matchedEmployee?.shiftStartTime || "09:00 AM",
          graceMinutes: matchedEmployee?.graceMinutes || 15,
        },
        staff: {
          id: matchedEmployee?.id || `staff-${clean10}`,
          name: matchedEmployee?.name || "Staff Member",
          branch: matchedEmployee?.branchName || "KPHB Branch",
          shiftStartTime: matchedEmployee?.shiftStartTime || "09:00 AM",
          graceMinutes: matchedEmployee?.graceMinutes || 15,
        },
      });
    }

    // ----------------------------------------------------
    // CASE 4: COMBINED doctor_reception (SMART AUTO-DETECT)
    // ----------------------------------------------------
    if (requestedRole === "DOCTOR_RECEPTION") {
      if (isDoctor) {
        const docName =
          matchedSchedule?.doctorName ||
          matchedEmployee?.name ||
          dbUser?.name ||
          "Doctor";
        const docId =
          matchedSchedule?.doctorId ||
          matchedSchedule?.id ||
          matchedEmployee?.id ||
          dbUser?.id ||
          `doc-${clean10}`;
        const specialty = matchedSchedule?.specialty || "Consultant Homeopath";
        const branchName = matchedEmployee?.branchName || "KPHB Branch";

        const isHead =
          matchedEmployee?.doctorCategory === "HEAD" ||
          matchedEmployee?.category === "HEAD" ||
          (matchedSchedule?.specialty || "").toLowerCase().includes("head") ||
          (matchedSchedule?.specialty || "").toLowerCase().includes("chief") ||
          (matchedSchedule as any)?.doctorCategory === "HEAD" ||
          dbUser?.role === "HEAD_DOCTOR" ||
          dbUser?.doctorCategory === "HEAD" ||
          docName.toLowerCase().includes("prashanth") ||
          docName.toLowerCase().includes("head") ||
          docName.toLowerCase().includes("vaidya") ||
          docName.toLowerCase().includes("chief");

        const doctorCategory = isHead ? "HEAD" : (matchedEmployee?.doctorCategory || "EMPLOYEE");

        return NextResponse.json({
          authorized: true,
          role: "DOCTOR",
          doctor: {
            id: docId,
            name: docName,
            phone: matchedSchedule?.phone || matchedEmployee?.phone || clean10,
            specialty,
            branch: branchName,
            doctorCategory,
            isHeadDoctor: isHead,
          },
        });
      }

      if (isReception) {
        const branchData = matchedBranch || {
          id: matchedEmployee?.branchId || `b-${clean10}`,
          name: matchedEmployee?.branchName || "Clinic Branch",
          phone: matchedEmployee?.phone || clean10,
          address: "",
        };
        return NextResponse.json({
          authorized: true,
          role: "RECEPTION",
          branch: {
            id: branchData.id,
            name: branchData.name,
            phone: branchData.phone,
            address: branchData.address || "",
          },
        });
      }

      return NextResponse.json(
        {
          authorized: false,
          error: `Access Denied: Mobile number ${clean10} is not registered as a Doctor or Reception contact.`,
        },
        { status: 403 }
      );
    }

    // Fallback for unexpected role
    return NextResponse.json(
      {
        authorized: false,
        error: `Access Denied: Invalid role "${role}" requested.`,
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { authorized: false, error: err.message || "Failed to validate phone." },
      { status: 500 }
    );
  }
}
