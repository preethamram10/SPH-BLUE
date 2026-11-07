import { NextResponse } from "next/server";
import { employeeService } from "@spiritualhomeo/database";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const employees = await employeeService.getAllEmployees();
    const target = employees.find((e) => e.id === id);

    if (!target) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const newAccess =
      body.isAccessGranted !== undefined
        ? Boolean(body.isAccessGranted)
        : !target.isAccessGranted;

    const updated = await employeeService.updateEmployee(id, {
      isAccessGranted: newAccess,
      shiftStartTime: body.shiftStartTime || target.shiftStartTime,
      graceMinutes: body.graceMinutes !== undefined ? Number(body.graceMinutes) : target.graceMinutes,
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to toggle employee access" }, { status: 500 });
  }
}

