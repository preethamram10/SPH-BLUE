import { NextRequest, NextResponse } from "next/server";
import { trackShiprocketShipment } from "@/utils/shiprocket";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const awb = searchParams.get("awb");

    if (!awb?.trim()) {
      return NextResponse.json(
        { success: false, error: "AWB tracking number is required." },
        { status: 400 }
      );
    }

    const result = await trackShiprocketShipment(awb.trim());

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("GET /api/shiprocket/track error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to track shipment in Shiprocket.",
      },
      { status: 500 }
    );
  }
}
