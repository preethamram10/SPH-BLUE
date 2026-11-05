import { NextRequest, NextResponse } from "next/server";
import { patientService } from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, regId, newName, targetRegId, sourceRegId, reason, deletedBy } = body;

    if (action === "UPDATE_NAME") {
      if (!regId || !newName) {
        return NextResponse.json(
          { success: false, error: "regId and newName are required" },
          { status: 400 }
        );
      }
      const updated = await patientService.updatePatientName(regId, newName);
      if (!updated) {
        return NextResponse.json({ success: false, error: "Patient profile not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, profile: updated });
    }

    if (action === "MERGE") {
      if (!targetRegId || !sourceRegId) {
        return NextResponse.json(
          { success: false, error: "targetRegId and sourceRegId are required" },
          { status: 400 }
        );
      }
      const result = await patientService.mergeProfiles(targetRegId, sourceRegId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "DELETE") {
      if (!regId) {
        return NextResponse.json({ success: false, error: "regId is required" }, { status: 400 });
      }
      const deleted = await patientService.deletePatientProfile(
        regId,
        deletedBy || "Reception",
        reason || "Receptionist request"
      );
      if (!deleted) {
        return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, profile: deleted });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to manage patient profile" },
      { status: 500 }
    );
  }
}

