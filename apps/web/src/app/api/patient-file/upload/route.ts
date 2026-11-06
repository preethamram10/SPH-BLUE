import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToS3 } from "@/utils/s3Upload";

export async function POST(req: NextRequest) {
  try {
    const contentTypeHeader = req.headers.get("content-type") || "";

    let buffer: Buffer | null = null;
    let fileName = `prescription_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    let contentType = "image/jpeg";
    let patientId = "general";

    if (contentTypeHeader.includes("application/json")) {
      const body = await req.json();
      const rawBase64 = body.base64 || body.image || "";

      if (!rawBase64) {
        return NextResponse.json(
          { success: false, error: "Image data (base64) is required." },
          { status: 400 }
        );
      }

      patientId = body.patientId || body.registrationId || "general";
      if (body.fileName) fileName = body.fileName;
      if (body.contentType) contentType = body.contentType;

      if (rawBase64.startsWith("data:image/svg+xml;utf8,")) {
        const svgText = decodeURIComponent(rawBase64.substring("data:image/svg+xml;utf8,".length));
        buffer = Buffer.from(svgText, "utf-8");
        contentType = "image/svg+xml";
        if (!fileName.endsWith(".svg")) fileName = fileName.replace(/\.[^.]+$/, ".svg");
      } else if (rawBase64.startsWith("<svg")) {
        buffer = Buffer.from(rawBase64, "utf-8");
        contentType = "image/svg+xml";
        if (!fileName.endsWith(".svg")) fileName = fileName.replace(/\.[^.]+$/, ".svg");
      } else {
        // Strip data:image/...;base64, or any data uri scheme if present
        const base64Data = rawBase64.replace(/^data:[^;]+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      }
    } else if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      patientId = (formData.get("patientId") as string) || "general";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "Form-data file is required." },
          { status: 400 }
        );
      }

      fileName = file.name || fileName;
      contentType = file.type || "image/jpeg";
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      // Raw binary body
      const bytes = await req.arrayBuffer();
      if (bytes.byteLength === 0) {
        return NextResponse.json(
          { success: false, error: "No image payload provided." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(bytes);
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid image content." },
        { status: 400 }
      );
    }

    // Sanitize patient ID for S3 key path
    const safePatientId = patientId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const s3Key = `prescriptions/${safePatientId}/${Date.now()}_${safeFileName}`;

    // Upload directly to AWS S3 (Bucket: sph-prescription, Region: ap-south-1)
    const prescriptionUrl = await uploadBufferToS3({
      buffer,
      key: s3Key,
      contentType,
    });

    return NextResponse.json({
      success: true,
      url: prescriptionUrl,
      key: s3Key,
      message: "Prescription image stored in AWS S3 successfully.",
    });
  } catch (error: any) {
    console.error("Prescription upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to upload prescription image.",
      },
      { status: 500 }
    );
  }
}

