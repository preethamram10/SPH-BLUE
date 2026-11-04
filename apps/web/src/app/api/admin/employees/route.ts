import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const employees = await employeeService.getAllEmployees(category);
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
