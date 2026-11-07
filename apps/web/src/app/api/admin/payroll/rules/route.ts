import { NextResponse } from "next/server";
import { payrollSettingsService } from "@spiritualhomeo/database";

export async function GET() {
  try {
    const config = await payrollSettingsService.getLatePenaltyConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to get payroll rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = await payrollSettingsService.updateLatePenaltyConfig(body);
    return NextResponse.json({ success: true, config: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update payroll rules" }, { status: 500 });
  }
}

