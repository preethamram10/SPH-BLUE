import { NextRequest, NextResponse } from "next/server";
import { patientService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || "";

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ success: true, profiles: [] });
    }

    const profiles = await patientService.getProfilesByPhone(phone);
    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch profiles for phone number" },
      { status: 500 }
    );
  }
}

