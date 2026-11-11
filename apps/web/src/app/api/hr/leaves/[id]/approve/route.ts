import { NextResponse } from "next/server";
import { staffLeaveService } from "@spiritualhomeo/database";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updated = await staffLeaveService.approveLeave(id, "HR");
    if (!updated) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to approve leave" }, { status: 500 });
  }
}

