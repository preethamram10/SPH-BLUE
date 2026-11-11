import { NextRequest, NextResponse } from "next/server";
import { employeeService, appointmentService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    let employees = await employeeService.getAllEmployees(category);

    // If TELECALLER requested and none exist yet, seed initial telecallers
    if (category === "TELECALLER" && employees.length === 0) {
      const seeded = [
        {
          name: "Srikanth Reddy",
          telecallerId: "TC01",
          phone: "9848012345",
          email: "srikanth@sph.com",
          branchName: "All Branches",
          category: "TELECALLER",
          targetQuota: "60 calls/day",
          status: "Active",
          password: "sph12345",
        },
        {
          name: "Salman Khan",
          telecallerId: "TC02",
          phone: "7842836959",
          email: "salman@sph.com",
          branchName: "KPHB Branch",
          category: "TELECALLER",
          targetQuota: "70 calls/day",
          status: "Active",
          password: "sph12345",
        },
        {
          name: "K. Bhavani",
          telecallerId: "TC03",
          phone: "9848554433",
          email: "bhavani@sph.com",
          branchName: "Chandanagar Branch",
          category: "TELECALLER",
          targetQuota: "65 calls/day",
          status: "Active",
          password: "sph12345",
        },
      ];
      for (const item of seeded) {
        await employeeService.createEmployee(item as any);
      }
      employees = await employeeService.getAllEmployees("TELECALLER");
    }

    if (category === "TELECALLER") {
      const allAppts = await appointmentService.getAppointments();
      const countMap: Record<string, number> = {};
      for (const a of allAppts) {
        if (a.bookedByTelecallerId) {
          const k = a.bookedByTelecallerId.toUpperCase();
          countMap[k] = (countMap[k] || 0) + 1;
        }
        if (a.bookedByTelecallerName) {
          const kName = a.bookedByTelecallerName.toLowerCase();
          countMap[kName] = (countMap[kName] || 0) + 1;
        }
      }

      let maxNum = 0;
      for (const e of employees) {
        const tid = e.telecallerId || "";
        const m = tid.match(/^TC(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      const nextTelecallerId = `TC${String(maxNum + 1).padStart(2, "0")}`;

      const enriched = employees.map((e) => {
        const idKey = (e.telecallerId || "").toUpperCase();
        const nameKey = (e.name || "").toLowerCase();
        const count = (countMap[idKey] || 0) + (countMap[nameKey] || 0);
        return {
          ...e,
          bookedCount: count,
        };
      });

      return NextResponse.json({ success: true, employees: enriched, nextTelecallerId });
    }

    return NextResponse.json({ success: true, employees });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.phone) {
      return NextResponse.json({ error: "Name and Phone are required" }, { status: 400 });
    }

    const employee = await employeeService.createEmployee(body);
    return NextResponse.json({ success: true, employee }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create employee" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const updated = await employeeService.updateEmployee(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    await employeeService.deleteEmployee(id);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete employee" }, { status: 500 });
  }
}
