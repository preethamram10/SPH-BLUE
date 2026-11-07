import { NextResponse } from "next/server";
import { staffLeaveService } from "@spiritualhomeo/database";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, staffName, branch, leaveType, fromDate, toDate, joiningDate, reason } = body;

    if (!staffId || !leaveType || !fromDate || !toDate || !reason) {
      return NextResponse.json({ error: "Missing required leave fields" }, { status: 400 });
    }

    const saved = await staffLeaveService.applyLeave({
      staffId,
      staffName: staffName || "Staff Member",
      branch: branch || "KPHB Branch",
      leaveType,
      fromDate,
      toDate,
      joiningDate: joiningDate || toDate,
      reason,
      status: "Pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit leave" }, { status: 500 });
  }
}

