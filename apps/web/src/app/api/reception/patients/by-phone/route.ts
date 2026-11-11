import { NextRequest, NextResponse } from "next/server";
import { patientService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = (searchParams.get("phone") || searchParams.get("query") || "").trim();

    if (!rawQuery) {
      return NextResponse.json({ success: true, profiles: [] });
    }

    // Check if user entered a Patient Registration ID (e.g., SPH-KPB-0001 or letters)
    if (/[a-zA-Z]/.test(rawQuery)) {
      const patient = await patientService.getByRegId(rawQuery);
      if (patient && !patient.isDeleted) {
        if (patient.phone) {
          const profiles = await patientService.getProfilesByPhone(patient.phone);
          if (profiles.length > 0) {
            return NextResponse.json({ success: true, profiles });
          }
        }
        return NextResponse.json({
          success: true,
          profiles: [{ ...patient, appointmentCount: 1 }],
        });
      }
    }

    const cleanDigits = rawQuery.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      return NextResponse.json({ success: true, profiles: [] });
    }

    const profiles = await patientService.getProfilesByPhone(cleanDigits);
    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

