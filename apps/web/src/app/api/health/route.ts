import { NextResponse } from "next/server";

// Fast, zero-overhead health endpoint for network connectivity & handover probing
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: Date.now() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

