import { NextResponse } from "next/server";
import { staffAttendanceService } from "@spiritualhomeo/database";
import { uploadAttendancePhotoToS3 } from "@/utils/s3Upload";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, staffName, branch, type, photo, location, coords } = body;

    if (!staffId || !type || !photo) {
      return NextResponse.json(
        { error: "Staff ID, punch type (in/out), and selfie photo are required." },
        { status: 400 }
      );
    }

    // Upload selfie to AWS S3 using dedicated attendance credentials
    let finalPhotoUrl = photo;
    if (typeof photo === "string" && photo.startsWith("data:image")) {
      try {
        finalPhotoUrl = await uploadAttendancePhotoToS3(photo, staffId, type);
      } catch (s3Err) {
        console.warn("AWS S3 attendance selfie upload warning (falling back to compressed data):", s3Err);
        finalPhotoUrl = photo;
      }
    }

    const record = await staffAttendanceService.recordPunch({
      staffId,
      staffName: staffName || "Staff Member",
      branch: branch || "KPHB Branch",
      type,
      photo: finalPhotoUrl,
      location: location || "Clinic Location",
      coords,
    });

    return NextResponse.json(record);
  } catch (err: any) {
    console.error("Attendance punch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record punch" },
      { status: 500 }
    );
  }
}

