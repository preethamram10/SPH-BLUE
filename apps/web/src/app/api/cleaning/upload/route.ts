import { NextRequest, NextResponse } from "next/server";
import { uploadCleaningPhotoBufferToS3 } from "@/utils/s3Upload";
import { toDDMMYYYY } from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const contentTypeHeader = req.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let branchName = "General";
    let assignedDate = "";
    let fieldName = "GeneralArea";
    let contentType = "image/jpeg";
    let ext = "jpg";

    // 1. Handle JSON upload (from Mobile Staff App with base64)
    if (contentTypeHeader.includes("application/json")) {
      const body = await req.json();
      branchName = body.branchName || "General";
      assignedDate = body.assignedDate || "";
      fieldName = body.fieldName || "GeneralArea";
      contentType = body.contentType || "image/jpeg";

      if (!body.base64) {
        return NextResponse.json(
          { success: false, error: "No image base64 data provided." },
          { status: 400 }
        );
      }

      const cleanBase64 = body.base64.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(cleanBase64, "base64");
      ext = contentType.includes("png") ? "png" : "jpg";
    }
    // 2. Handle Multipart Form Data (from Web Browser)
    else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      branchName = (formData.get("branchName") as string) || "General";
      assignedDate = (formData.get("assignedDate") as string) || "";
      fieldName = (formData.get("fieldName") as string) || "GeneralArea";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No image file provided." },
          { status: 400 }
        );
      }

      buffer = Buffer.from(await file.arrayBuffer());
      contentType = file.type || "image/jpeg";
      ext = file.name ? file.name.split(".").pop() || "jpg" : "jpg";
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or empty image buffer." },
        { status: 400 }
      );
    }

    // Format folder strictly: cleaning-branch-sph/<branch>/<DD-MM-YYYY>/<field>/<timestamp>.<ext>
    const cleanBranch = branchName.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
    const cleanDate = toDDMMYYYY(assignedDate);
    const cleanField = fieldName.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").toLowerCase();
    const filename = `clean_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const s3Key = `${cleanBranch}/${cleanDate}/${cleanField}/${filename}`;

    const uploadedUrl = await uploadCleaningPhotoBufferToS3(buffer, s3Key, contentType);

    return NextResponse.json({
      success: true,
      url: uploadedUrl,
      key: s3Key,
      fileName: filename,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Cleaning Photo S3 Upload Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to upload cleaning image to AWS S3.",
      },
      { status: 500 }
    );
  }
}
