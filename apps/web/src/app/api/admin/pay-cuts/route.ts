import { NextResponse } from "next/server";
import { payCutService } from "@spiritualhomeo/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") || undefined;
    const month = searchParams.get("month") || undefined;

    const cuts = await payCutService.getAllPayCuts(employeeId, month);
    return NextResponse.json({ success: true, payCuts: cuts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load pay cuts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, employeeName, branch, amount, reason, month, date, image, issuedBy } = body;

    if (!employeeId || !amount || !reason) {
      return NextResponse.json(
        { error: "Employee, amount, and reason are required for a pay cut." },
        { status: 400 }
      );
    }

    const created = await payCutService.createPayCut({
      employeeId,
      employeeName: employeeName || "Staff Member",
      branch: branch || "KPHB Branch",
      amount: Number(amount),
      reason,
      month: month || new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
      date: date || new Date().toISOString().split("T")[0],
      image,
      issuedBy: issuedBy || "Admin",
    });

    return NextResponse.json({ success: true, payCut: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create pay cut" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Pay cut ID is required" }, { status: 400 });
    }

    const deleted = await payCutService.deletePayCut(id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete pay cut" }, { status: 500 });
  }
}

