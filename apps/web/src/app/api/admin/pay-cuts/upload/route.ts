import { NextResponse } from "next/server";
import { uploadPayCutProofToS3 } from "@/utils/s3Upload";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const contentTypeHeader = req.headers.get("content-type") || "";

    // 1. Multipart Form Data (direct file upload from input type="file")
    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const employeeId = (formData.get("employeeId") as string) || "staff";

      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = file.name || "proof.jpg";
      const contentType = file.type || "image/jpeg";

      const url = await uploadPayCutProofToS3(buffer, fileName, contentType, employeeId);
      return NextResponse.json({ success: true, url });
    }

    // 2. JSON Payload (base64 data URI)
    const body = await req.json();
    const { fileData, fileName, employeeId, mimeType } = body;

    if (!fileData) {
      return NextResponse.json({ success: false, error: "fileData is required" }, { status: 400 });
    }

    let buffer: Buffer;
    let contentType = mimeType || "image/jpeg";

    if (typeof fileData === "string" && fileData.startsWith("data:")) {
      const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else {
        buffer = Buffer.from(fileData, "base64");
      }
    } else {
      buffer = Buffer.from(fileData, "base64");
    }

    const safeName = fileName || `proof_${Date.now()}.jpg`;
    const url = await uploadPayCutProofToS3(buffer, safeName, contentType, employeeId || "staff");

    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    console.error("Failed to upload pay cut proof to AWS S3:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload proof to AWS S3" },
      { status: 500 }
    );
  }
}