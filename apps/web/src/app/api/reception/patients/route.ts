import { NextRequest, NextResponse } from "next/server";
import { patientService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regId = searchParams.get("regId");
    const query = searchParams.get("query");
    const branch = searchParams.get("branch") || undefined;

    // Lookup by Registration ID (Exact)
    if (regId) {
      const patient = await patientService.getByRegId(regId);
      return NextResponse.json({ success: true, patient });
    }

    // Search by text query (autocomplete)
    if (query) {
      const suggestions = await patientService.searchPatients(query, branch);
      return NextResponse.json({ success: true, suggestions });
    }

    // List all
    const all = await patientService.getAllPatients(branch);
    return NextResponse.json({ success: true, patients: all });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query patients" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { regId, name, phone, email, diseases, branch } = body;

    if (!regId || !name || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (regId, name, phone)" },
        { status: 400 }
      );
    }

    const saved = await patientService.upsertPatient({
      regId,
      name,
      phone,
      email,
      diseases,
      branch: branch || "Clinic Branch",
    });

    return NextResponse.json({ success: true, patient: saved });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save patient" },
      { status: 500 }
    );
  }
}

