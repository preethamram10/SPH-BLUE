import { NextRequest, NextResponse } from "next/server";
import { generateShiprocketLabel } from "@/utils/shiprocket";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shipmentId = body.shipmentId || body.shipment_id;

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, error: "shipmentId is required to generate label." },
        { status: 400 }
      );
    }

    const result = await generateShiprocketLabel(shipmentId);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("POST /api/shiprocket/generate-label error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate label in Shiprocket.",
      },
      { status: 500 }
    );
  }
}
