import { NextResponse } from "next/server";
import { staffLeaveService } from "@spiritualhomeo/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const leaves = await staffLeaveService.getAllLeaves();
    return NextResponse.json({ success: true, leaves });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load leaves" }, { status: 500 });
  }
}
