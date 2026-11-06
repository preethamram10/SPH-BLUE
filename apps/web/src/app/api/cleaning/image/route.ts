import { NextRequest, NextResponse } from "next/server";
import { fetchCleaningPhotoFromS3 } from "@/utils/s3Upload";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let key = searchParams.get("key") || "";
    const rawUrl = searchParams.get("url") || "";

    if (!key && rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      } catch {
        key = rawUrl.replace(/^https?:\/\/[^\/]+\//, "");
      }
    }

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Image key or url is required." },
        { status: 400 }
      );
    }

    const result = await fetchCleaningPhotoFromS3(key);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Image not found or access denied in S3." },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load image." },
      { status: 500 }
    );
  }
}
