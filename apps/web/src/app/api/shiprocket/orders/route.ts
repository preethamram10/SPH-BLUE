import { NextRequest, NextResponse } from "next/server";
import { getShiprocketOrders } from "@/utils/shiprocket";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("perPage") || "50", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";

    const result = await getShiprocketOrders({ page, perPage, search });

    let filtered = result.shipments;
    if (status !== "ALL") {
      filtered = filtered.filter((s) => s.statusLabel.toLowerCase() === status.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      shipments: filtered,
      total: result.total,
      raw: result.raw,
    });
  } catch (error: any) {
    console.error("GET /api/shiprocket/orders error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch orders from Shiprocket",
      },
      { status: 500 }
    );
  }
}
