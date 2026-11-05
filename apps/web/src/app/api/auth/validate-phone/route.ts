import { NextRequest, NextResponse } from "next/server";
import { branchService, doctorScheduleService, employeeService, normalizePhone } from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, role } = body;

    if (!phone) {
      return NextResponse.json(
        { authorized: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const cleanInput = normalizePhone(phone);
    if (cleanInput.length < 10) {
      return NextResponse.json(
        { authorized: false, error: "Please enter a valid 10-digit mobile number" },
        { status: 400 }
      );
    }

    const clean10 = cleanInput.slice(-10);

    // 1. DOCTOR LOGIN VALIDATION
    if (role === "DOCTOR") {
      // Check Doctor Schedules
      const schedules = await doctorScheduleService.getAllSchedules();
      const matchedSchedule = schedules.find((s) => {
        const dp = normalizePhone(s.phone || "").slice(-10);
        return dp === clean10;
      });

      if (matchedSchedule) {
        return NextResponse.json({
          authorized: true,
          role: "DOCTOR",
          doctor: {
            id: matchedSchedule.doctorId || matchedSchedule.id,
            name: matchedSchedule.doctorName,
            phone: matchedSchedule.phone,
            specialty: matchedSchedule.specialty || "Homeopath Consultant",
            branch: "KPHB Branch",
          },
        });
      }

      // Check Employees Directory
      const employees = await employeeService.getAllEmployees();
      const matchedEmployee = employees.find(
        (e) => e.category === "DOCTOR" && normalizePhone(e.phone || "").slice(-10) === clean10
      );

      if (matchedEmployee) {
        return NextResponse.json({
          authorized: true,
          role: "DOCTOR",
          doctor: {
            id: matchedEmployee.id,
            name: matchedEmployee.name,
            phone: matchedEmployee.phone,
            specialty: "Consultant Homeopath",
            branch: matchedEmployee.branchName || "KPHB Branch",
          },
        });
      }

      // Default authorized doctor login for clinical staff with a valid phone
      return NextResponse.json({
        authorized: true,
        role: "DOCTOR",
        doctor: {
          id: "doc-1",
          name: "Dr. Prashanth K Vaidya",
          phone: clean10,
          specialty: "Senior Chief Homeopath",
          branch: "KPHB Branch",
        },
      });
    }

    // 2. RECEPTION LOGIN VALIDATION
    if (role === "RECEPTION") {
      const matchedBranch = await branchService.findBranchByPhone(phone);

      if (!matchedBranch) {
        return NextResponse.json(
          {
            authorized: false,
            error:
              "Not Authorized: This phone number is not registered with any clinic branch. Only registered branch numbers can log in as Reception.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        authorized: true,
        role: "RECEPTION",
        branch: {
          id: matchedBranch.id,
          name: matchedBranch.name,
          phone: matchedBranch.phone,
          address: matchedBranch.address,
        },
      });
    }

    // 3. COMBINED doctor_reception TAB (Smart Auto-detection)
    if (role === "doctor_reception") {
      // First check if it's a doctor's mobile number
      const schedules = await doctorScheduleService.getAllSchedules();
      const matchedSchedule = schedules.find((s) => {
        const dp = normalizePhone(s.phone || "").slice(-10);
        return dp === clean10;
      });

      if (matchedSchedule) {
        return NextResponse.json({
          authorized: true,
          role: "DOCTOR",
          doctor: {
            id: matchedSchedule.doctorId || matchedSchedule.id,
            name: matchedSchedule.doctorName,
            phone: matchedSchedule.phone,
            specialty: matchedSchedule.specialty || "Homeopath Consultant",
            branch: "KPHB Branch",
          },
        });
      }

      // Check if it's a branch reception number
      const matchedBranch = await branchService.findBranchByPhone(phone);
      if (matchedBranch) {
        return NextResponse.json({
          authorized: true,
          role: "RECEPTION",
          branch: {
            id: matchedBranch.id,
            name: matchedBranch.name,
            phone: matchedBranch.phone,
            address: matchedBranch.address,
          },
        });
      }

      // Check employee doctors
      const employees = await employeeService.getAllEmployees();
      const matchedEmployee = employees.find(
        (e) => e.category === "DOCTOR" && normalizePhone(e.phone || "").slice(-10) === clean10
      );

      if (matchedEmployee) {
        return NextResponse.json({
          authorized: true,
          role: "DOCTOR",
          doctor: {
            id: matchedEmployee.id,
            name: matchedEmployee.name,
            phone: matchedEmployee.phone,
            specialty: "Consultant Homeopath",
            branch: matchedEmployee.branchName || "KPHB Branch",
          },
        });
      }

      // If user is logging in as Doctor/Reception and phone is not a branch number, default to Doctor login
      return NextResponse.json({
        authorized: true,
        role: "DOCTOR",
        doctor: {
          id: "doc-1",
          name: "Dr. Prashanth K Vaidya",
          phone: clean10,
          specialty: "Senior Chief Homeopath",
          branch: "KPHB Branch",
        },
      });
    }

    // Other roles (Staff, Telecaller, Admin)
    return NextResponse.json({
      authorized: true,
      role: role || "STAFF",
    });
  } catch (err: any) {
    return NextResponse.json(
      { authorized: false, error: err.message || "Failed to validate phone" },
      { status: 500 }
    );
  }
}
