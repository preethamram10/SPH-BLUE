import { NextRequest, NextResponse } from "next/server";
import { scheduleShiprocketPickup } from "@/utils/shiprocket";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shipmentId = body.shipmentId || body.shipment_id;

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, error: "shipmentId is required to schedule pickup." },
        { status: 400 }
      );
    }

    const result = await scheduleShiprocketPickup(shipmentId);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("POST /api/shiprocket/schedule-pickup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to schedule pickup in Shiprocket.",
      },
      { status: 500 }
    );
  }
}
