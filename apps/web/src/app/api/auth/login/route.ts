import { NextResponse } from "next/server";
import {
  prisma,
  branchService,
  doctorScheduleService,
  employeeService,
  normalizePhone,
} from "@spiritualhomeo/database";

export async function POST(request: Request) {
  try {
    const { identifier, password, requestedRole } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: "Phone number or email is required" },
        { status: 400 }
      );
    }

    const cleanInput = normalizePhone(identifier);
    const clean10 = cleanInput.length >= 10 ? cleanInput.slice(-10) : identifier.trim();
    const reqRole = (requestedRole || "").toUpperCase();

    // Look up data
    const branches = await branchService.getAllBranches();
    const matchedBranch = branches.find((b) => {
      const bp = normalizePhone(b.phone || "").slice(-10);
      return bp === clean10;
    });

    const schedules = await doctorScheduleService.getAllSchedules();
    const matchedSchedule = schedules.find((s) => {
      const sp = normalizePhone(s.phone || "").slice(-10);
      return sp === clean10;
    });

    const employees = await employeeService.getAllEmployees();
    const matchedEmployee = employees.find((e) => {
      const ep = normalizePhone(e.phone || "").slice(-10);
      return ep === clean10;
    });

    let dbUser: any = null;
    try {
      dbUser = await prisma.user.findFirst({
        where: {
          OR: [{ phone: { contains: clean10 } }, { email: identifier }],
        },
      });
    } catch {}

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

    // 1. RECEPTION LOGIN
    if (reqRole === "RECEPTION") {
      if (isDoctor) {
        const docName = matchedSchedule?.doctorName || matchedEmployee?.name || "Doctor";
        return NextResponse.json(
          {
            error: `Access Denied: ${clean10} belongs to ${docName} (Doctor), not Reception. Please use the Doctor portal.`,
          },
          { status: 403 }
        );
      }

      if (!isReception) {
        return NextResponse.json(
          {
            error: `Access Denied: ${clean10} is not registered with any clinic branch or receptionist.`,
          },
          { status: 403 }
        );
      }

      const branch = matchedBranch || {
        id: matchedEmployee?.branchId || `b-${clean10}`,
        name: matchedEmployee?.branchName || "Clinic Branch",
        phone: matchedEmployee?.phone || clean10,
      };

      const token = Buffer.from(
        JSON.stringify({
          userId: `reception-branch-${branch.id}`,
          role: "RECEPTION",
          branchId: branch.id,
          branchName: branch.name,
          identifier,
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
      ).toString("base64");

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: `reception-branch-${branch.id}`,
          name: `${branch.name} (Reception)`,
          role: "RECEPTION",
          branch: {
            id: branch.id,
            name: branch.name,
            phone: branch.phone,
          },
          identifier,
        },
      });
    }

    // 2. DOCTOR LOGIN
    if (reqRole === "DOCTOR") {
      if (isReception) {
        const bName = matchedBranch?.name || matchedEmployee?.branchName || "Reception";
        return NextResponse.json(
          {
            error: `Access Denied: ${clean10} belongs to ${bName} (Reception), not Doctor. Please use the Reception portal.`,
          },
          { status: 403 }
        );
      }

      if (!isDoctor) {
        return NextResponse.json(
          {
            error: `Access Denied: ${clean10} is not registered as a Doctor in the clinic system.`,
          },
          { status: 403 }
        );
      }

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

      const token = Buffer.from(
        JSON.stringify({
          userId: docId,
          role: "DOCTOR",
          name: docName,
          identifier,
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
      ).toString("base64");

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: docId,
          name: docName,
          role: "DOCTOR",
          identifier,
        },
      });
    }

    // 3. TELECALLER LOGIN
    if (reqRole === "TELECALLER") {
      if (isDoctor || isReception) {
        return NextResponse.json(
          {
            error: `Access Denied: ${clean10} is registered under another clinical role, not Telecalling.`,
          },
          { status: 403 }
        );
      }

      if (!isTelecaller) {
        return NextResponse.json(
          {
            error: `Access Denied: ${clean10} is not registered for telecalling or staff access.`,
          },
          { status: 403 }
        );
      }

      const tcName = matchedEmployee?.name || dbUser?.name || "Telecaller Staff";
      const tcId = matchedEmployee?.id || dbUser?.id || `tc-${clean10}`;

      const token = Buffer.from(
        JSON.stringify({
          userId: tcId,
          role: "TELECALLER",
          name: tcName,
          identifier,
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
      ).toString("base64");

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: tcId,
          name: tcName,
          role: "TELECALLER",
          identifier,
        },
      });
    }

    // 4. ADMIN / HR LOGIN
    if (reqRole === "ADMIN" || reqRole === "HR") {
      if (dbUser?.role !== reqRole && matchedEmployee?.category !== reqRole) {
        return NextResponse.json(
          { error: `Access Denied: ${identifier} does not have ${reqRole} privileges.` },
          { status: 403 }
        );
      }

      const role = reqRole;
      const userName = dbUser?.name || matchedEmployee?.name || `${role} Member`;
      const userId = dbUser?.id || matchedEmployee?.id || `user-${role.toLowerCase()}-1`;

      const token = Buffer.from(
        JSON.stringify({
          userId,
          role,
          identifier,
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
      ).toString("base64");

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: userId,
          name: userName,
          role,
          identifier,
        },
      });
    }

    // 5. STAFF LOGIN
    if (reqRole === "STAFF") {
      const isStaffUser =
        matchedEmployee?.category === "STAFF" ||
        matchedEmployee?.category === "RECEPTION" ||
        matchedEmployee?.category === "TELECALLER" ||
        dbUser?.role === "STAFF";

      if (!isStaffUser) {
        return NextResponse.json(
          { error: `Access Denied: ${clean10} is not registered as a Staff member.` },
          { status: 403 }
        );
      }

      if (matchedEmployee && matchedEmployee.isAccessGranted === false) {
        return NextResponse.json(
          {
            error: `Access Not Granted: Staff login has not been activated by HR or Admin yet. Please contact your Branch HR/Admin to give you access.`,
          },
          { status: 403 }
        );
      }

      const staffName = matchedEmployee?.name || dbUser?.name || "Staff Member";
      const staffId = matchedEmployee?.id || dbUser?.id || `staff-${clean10}`;
      const branchName = matchedEmployee?.branchName || "KPHB Branch";

      const token = Buffer.from(
        JSON.stringify({
          userId: staffId,
          role: "STAFF",
          name: staffName,
          branchName,
          identifier,
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
      ).toString("base64");

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: staffId,
          name: staffName,
          role: "STAFF",
          branchName,
          branch: { name: branchName },
          shiftStartTime: matchedEmployee?.shiftStartTime || "09:00 AM",
          graceMinutes: matchedEmployee?.graceMinutes || 15,
          identifier,
        },
      });
    }

    return NextResponse.json(
      { error: `Invalid or unrecognized requested role: ${requestedRole}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Authentication error" },
      { status: 500 }
    );
  }
}
