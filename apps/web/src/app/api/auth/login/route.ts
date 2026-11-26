import { NextResponse } from "next/server";
import {
  prisma,
  branchService,
  doctorScheduleService,
  employeeService,
  normalizePhone,
  loginActivityService,
} from "@spiritualhomeo/database";
import { signSessionToken, attachSessionCookie } from "@/lib/auth";

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

      const token = signSessionToken({
        userId: `reception-branch-${branch.id}`,
        role: "RECEPTION",
        branchId: branch.id,
        branchName: branch.name,
        identifier,
      });

      let sessionId = `log-${Date.now()}`;
      try {
        const act = await loginActivityService.recordLogin({
          userId: `reception-branch-${branch.id}`,
          userName: `${branch.name} (Reception)`,
          userRole: "RECEPTION",
          phone: clean10,
          branchName: branch.name,
          platform: "STAFF_APP",
        });
        sessionId = act.id;
      } catch (e) {
        console.warn("Failed to record reception login activity:", e);
      }

      return attachSessionCookie(
        NextResponse.json({
          success: true,
          token,
          sessionId,
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
        }),
        token
      );
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

      const rawDocName =
        matchedSchedule?.doctorName ||
        matchedEmployee?.name ||
        dbUser?.name ||
        "Doctor";
      const docName =
        rawDocName.toLowerCase().includes("vaidya") ||
        rawDocName.toLowerCase().includes("prasanth") ||
        rawDocName.toLowerCase().includes("prashant")
          ? "Dr. Prashant K Vaidya"
          : rawDocName;
      const docId =
        matchedSchedule?.doctorId ||
        matchedSchedule?.id ||
        matchedEmployee?.id ||
        dbUser?.id ||
        `doc-${clean10}`;

      const isHead =
        matchedEmployee?.doctorCategory === "HEAD" ||
        matchedEmployee?.category === "HEAD" ||
        (matchedSchedule?.specialty || "").toLowerCase().includes("head") ||
        (matchedSchedule?.specialty || "").toLowerCase().includes("chief") ||
        (matchedSchedule as any)?.doctorCategory === "HEAD" ||
        dbUser?.role === "HEAD_DOCTOR" ||
        dbUser?.doctorCategory === "HEAD" ||
        docName.toLowerCase().includes("prashant") ||
        docName.toLowerCase().includes("prashanth") ||
        docName.toLowerCase().includes("head") ||
        docName.toLowerCase().includes("vaidya") ||
        docName.toLowerCase().includes("chief");

      const doctorCategory = isHead ? "HEAD" : (matchedEmployee?.doctorCategory || "EMPLOYEE");

      const token = signSessionToken({
        userId: docId,
        role: "DOCTOR",
        name: docName,
        isHeadDoctor: isHead,
        doctorCategory,
        identifier,
      });

      return attachSessionCookie(
        NextResponse.json({
          success: true,
          token,
          user: {
            id: docId,
            name: docName,
            role: "DOCTOR",
            isHeadDoctor: isHead,
            doctorCategory,
            identifier,
          },
          doctor: {
            id: docId,
            name: docName,
            role: "DOCTOR",
            isHeadDoctor: isHead,
            doctorCategory,
            phone: matchedSchedule?.phone || matchedEmployee?.phone || clean10,
            specialty: matchedSchedule?.specialty || "Consultant Homeopath",
            branch: matchedEmployee?.branchName || "KPHB Branch",
          },
        }),
        token
      );
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

      const token = signSessionToken({
        userId: tcId,
        role: "TELECALLER",
        name: tcName,
        identifier,
      });

      return attachSessionCookie(
        NextResponse.json({
          success: true,
          token,
          user: {
            id: tcId,
            name: tcName,
            role: "TELECALLER",
            identifier,
          },
        }),
        token
      );
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

      const token = signSessionToken({
        userId,
        role,
        name: userName,
        identifier,
      });

      let sessionId = `log-${Date.now()}`;
      try {
        const act = await loginActivityService.recordLogin({
          userId,
          userName,
          userRole: role,
          phone: identifier,
          branchName: "All Branches",
          platform: "STAFF_APP",
        });
        sessionId = act.id;
      } catch (e) {
        console.warn("Failed to record admin/hr login activity:", e);
      }

      return attachSessionCookie(
        NextResponse.json({
          success: true,
          token,
          sessionId,
          user: {
            id: userId,
            name: userName,
            role,
            identifier,
          },
        }),
        token
      );
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

      const token = signSessionToken({
        userId: staffId,
        role: "STAFF",
        name: staffName,
        branchName,
        identifier,
      });

      let sessionId = `log-${Date.now()}`;
      try {
        const act = await loginActivityService.recordLogin({
          userId: staffId,
          userName: staffName,
          userRole: "STAFF",
          phone: clean10,
          branchName,
          platform: "STAFF_APP",
        });
        sessionId = act.id;
      } catch (e) {
        console.warn("Failed to record staff login activity:", e);
      }

      return attachSessionCookie(
        NextResponse.json({
          success: true,
          token,
          sessionId,
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
        }),
        token
      );
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
