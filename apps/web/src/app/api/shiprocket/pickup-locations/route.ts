import { NextResponse } from "next/server";
import { getShiprocketPickupLocations } from "@/utils/shiprocket";

export async function GET() {
  try {
    const locations = await getShiprocketPickupLocations();
    return NextResponse.json({
      success: true,
      locations,
    });
  } catch (error: any) {
    console.error("GET /api/shiprocket/pickup-locations error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch pickup locations",
      },
      { status: 500 }
    );
  }
}
