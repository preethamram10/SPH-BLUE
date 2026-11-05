import { NextRequest, NextResponse } from "next/server";
import { registrationSequenceService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || "KPB";
    const registrationId = await registrationSequenceService.getNextRegistrationId(branch);
    return NextResponse.json({ success: true, registrationId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate ID" },
      { status: 500 }
    );
  }
}

