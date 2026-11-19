import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

// In-memory server cache with 10-second TTL
const changeCache = new Map<string, { data: { maxUpdatedAt: string; count: number; version: string }; expiry: number }>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawBranch = searchParams.get("branch");
    const date = searchParams.get("date") || undefined;

    let cleanBranch = (rawBranch || "").replace(/Spiritual Homeopathy/gi, "").trim();
    if (!cleanBranch || cleanBranch.toLowerCase() === "clinic") {
      cleanBranch = "Kphb Branch";
    }

    const cacheKey = `${cleanBranch.toLowerCase()}:${date || "all"}`;
    const now = Date.now();
    const cached = changeCache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return NextResponse.json({
        success: true,
        branch: cleanBranch,
        date,
        ...cached.data,
      });
    }

    const changes = await appointmentService.getChanges(cleanBranch, date);
    changeCache.set(cacheKey, {
      data: changes,
      expiry: now + 10_000, // 10s TTL
    });

    return NextResponse.json({
      success: true,
      branch: cleanBranch,
      date,
      ...changes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check changes" },
      { status: 500 }
    );
  }
}
