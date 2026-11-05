import { NextRequest, NextResponse } from "next/server";
import { patientService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as "newest" | "oldest") || "newest";

    const profiles = await patientService.getDeletedProfiles(branch, search, sortBy);
    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch deleted profiles" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, regId } = body;

    if (!regId) {
      return NextResponse.json({ success: false, error: "regId is required" }, { status: 400 });
    }

    if (action === "RESTORE") {
      const restored = await patientService.restorePatientProfile(regId);
      if (!restored) {
        return NextResponse.json({ success: false, error: "Profile not found or already purged" }, { status: 404 });
      }
      return NextResponse.json({ success: true, profile: restored });
    }

    if (action === "PERMANENT_DELETE") {
      const success = await patientService.permanentlyDeletePatientProfile(regId);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute action on deleted profile" },
      { status: 500 }
    );
  }
}

