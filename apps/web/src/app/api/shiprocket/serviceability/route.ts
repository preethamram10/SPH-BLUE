import { NextRequest, NextResponse } from "next/server";
import { checkShiprocketServiceability } from "@/utils/shiprocket";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deliveryPostcode = searchParams.get("deliveryPincode") || searchParams.get("delivery_postcode") || "";
    const pickupPostcode = searchParams.get("pickupPincode") || searchParams.get("pickup_postcode") || "500060";
    const weightKg = parseFloat(searchParams.get("weight") || "0.5") || 0.5;
    const isCod = searchParams.get("cod") === "1" || searchParams.get("cod") === "true";

    if (!deliveryPostcode || deliveryPostcode.trim().length !== 6) {
      return NextResponse.json(
        { success: false, error: "Valid 6-digit delivery pincode is required." },
        { status: 400 }
      );
    }

    const couriers = await checkShiprocketServiceability(
      pickupPostcode.trim(),
      deliveryPostcode.trim(),
      weightKg,
      isCod
    );

    return NextResponse.json({
      success: true,
      deliveryPincode: deliveryPostcode,
      couriers,
      count: couriers.length,
    });
  } catch (error: any) {
    console.error("GET /api/shiprocket/serviceability error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch couriers and pricing from Shiprocket.",
      },
      { status: 500 }
    );
  }
}
