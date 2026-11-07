import { NextResponse } from "next/server";
import { staffDailyWorkService } from "@spiritualhomeo/database";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      staffId,
      staffName,
      branch,
      date,
      totalCalls,
      followUps,
      contacts,
      gReviews,
      videoReviews,
      workNotes,
    } = body;

    if (!staffId) {
      return NextResponse.json({ error: "staffId is required" }, { status: 400 });
    }

    const saved = await staffDailyWorkService.submitReport({
      staffId,
      staffName: staffName || "Staff Member",
      branch: branch || "KPHB Branch",
      date: date || new Date().toISOString().split("T")[0],
      totalCalls: Number(totalCalls) || 0,
      followUps: Number(followUps) || 0,
      contacts: Number(contacts) || 0,
      gReviews: Number(gReviews) || 0,
      videoReviews: Number(videoReviews) || 0,
      workNotes: workNotes || "",
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit daily work" }, { status: 500 });
  }
}

