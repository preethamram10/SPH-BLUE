import { NextRequest, NextResponse } from "next/server";
import {
  fetchPrescriptionPhotoFromS3,
  fetchCleaningPhotoFromS3,
  extractS3Key,
} from "@/utils/s3Upload";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get("key") || "";
    const urlParam = searchParams.get("url") || "";

    const rawKey = keyParam || urlParam;
    const key = extractS3Key(rawKey);

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Image key or url is required." },
        { status: 400 }
      );
    }

    // Try fetching from sph-prescriptions bucket first
    let result = await fetchPrescriptionPhotoFromS3(key);

    // Fallback to cleaning bucket in case older image was stored there
    if (!result) {
      result = await fetchCleaningPhotoFromS3(key);
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Prescription image not found in S3." },
        { status: 404 }
      );
    }

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load prescription image." },
      { status: 500 }
    );
  }
}

