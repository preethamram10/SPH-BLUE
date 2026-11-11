import { NextRequest, NextResponse } from "next/server";
import { telecallerCallLogService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const branch = searchParams.get("branch") || undefined;
    const outcome = searchParams.get("outcome") || undefined;
    const telecallerId = searchParams.get("telecallerId") || undefined;

    const logs = await telecallerCallLogService.getAllLogs({
      search,
      branch,
      outcome,
      telecallerId,
    });
    const stats = await telecallerCallLogService.getStats();

    return NextResponse.json({
      success: true,
      logs,
      stats,
    });
  } catch (error: any) {
    console.error("GET telecaller call logs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch call logs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientName,
      phone,
      branch,
      dateTime,
      callOutcome,
      notes,
      agentName,
      telecallerId,
    } = body;

    if (!patientName || !phone) {
      return NextResponse.json(
        { success: false, error: "Patient Name and Mobile Number are required." },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    const created = await telecallerCallLogService.createLog({
      patientName: String(patientName).trim(),
      phone: cleanPhone,
      branch: branch || "KPHB Branch",
      dateTime: dateTime || new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }),
      callOutcome: callOutcome || "Interested",
      notes: notes ? String(notes).trim() : "No conversation notes logged.",
      agentName: agentName ? String(agentName).trim() : "Telecaller Desk",
      telecallerId: telecallerId || "TC01",
    });

    return NextResponse.json({
      success: true,
      message: "Call update logged successfully",
      log: created,
    });
  } catch (error: any) {
    console.error("POST telecaller call log error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save call log" },
      { status: 500 }
    );
  }
}

