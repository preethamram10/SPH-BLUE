import { NextResponse } from "next/server";
import { staffLeaveService } from "@spiritualhomeo/database";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const reason = body.rejectionReason || "Declined by management";

    const updated = await staffLeaveService.rejectLeave(id, reason, "Admin/HR");
    if (!updated) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reject leave" }, { status: 500 });
  }
}

