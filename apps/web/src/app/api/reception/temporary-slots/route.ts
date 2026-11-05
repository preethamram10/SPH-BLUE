import { NextRequest, NextResponse } from "next/server";
import { temporarySlotsService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || "";
    const doctorId = searchParams.get("doctorId") || "";
    const date = searchParams.get("date") || "";

    if (!branch || !doctorId || !date) {
      return NextResponse.json({ success: true, slots: [] });
    }

    const slots = await temporarySlotsService.getTemporarySlots(branch, doctorId, date);
    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch temporary slots" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branch, doctorId, date, time, sessionIndex, action } = body;

    if (!branch || !doctorId || !date || !time) {
      return NextResponse.json(
        { success: false, error: "branch, doctorId, date, and time are required" },
        { status: 400 }
      );
    }

    let slots: { time: string; sessionIndex?: number }[] = [];
    if (action === "REMOVE") {
      slots = await temporarySlotsService.removeTemporarySlot(branch, doctorId, date, time);
    } else {
      slots = await temporarySlotsService.addTemporarySlot(branch, doctorId, date, time, sessionIndex);
    }

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update temporary slots" },
      { status: 500 }
    );
  }
}
