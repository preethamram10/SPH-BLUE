import { NextRequest, NextResponse } from "next/server";
import { createShiprocketShipment, CreateShipmentPayload } from "@/utils/shiprocket";

export async function POST(req: NextRequest) {
  try {
    const body: CreateShipmentPayload = await req.json();

    if (!body.patientName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Patient name is required." },
        { status: 400 }
      );
    }

    if (!body.phone?.trim() || body.phone.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Valid 10-digit phone number is required." },
        { status: 400 }
      );
    }

    if (!body.address?.trim() || !body.city?.trim() || !body.pincode?.trim()) {
      return NextResponse.json(
        { success: false, error: "Complete shipping address (Address, City, Pincode) is required." },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      body.items = [
        {
          name: "Homeopathy Remedy Kit & Diet Schedule",
          sku: `MED-${Date.now().toString().slice(-4)}`,
          units: 1,
          selling_price: body.subTotal || 500,
        },
      ];
    }

    const result = await createShiprocketShipment(body);

    return NextResponse.json({
      message: "Order dispatched to Shiprocket successfully.",
      ...result,
    });
  } catch (error: any) {
    console.error("POST /api/shiprocket/create-order error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create shipment in Shiprocket.",
      },
      { status: 500 }
    );
  }
}
