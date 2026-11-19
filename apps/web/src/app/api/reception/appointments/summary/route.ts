import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawBranch = searchParams.get("branch");
    const date = searchParams.get("date") || undefined;

    const isExplicitAll =
      rawBranch === "ALL" || rawBranch === "All Branches" || rawBranch?.toLowerCase() === "all";
    let cleanBranch = (rawBranch || "").replace(/Spiritual Homeopathy/gi, "").trim();
    if (!isExplicitAll && (!cleanBranch || cleanBranch.toLowerCase() === "clinic")) {
      cleanBranch = "Kphb Branch";
    }

    const branch = isExplicitAll ? undefined : cleanBranch;

    // Fast undecorated list lookup (runs in < 1ms)
    const list = await appointmentService.getAppointments(branch, date, undefined, false, false);

    let waiting = 0;
    let inConsultation = 0;
    let collectFee = 0;
    let completed = 0;
    let optedFollowUp = 0;
    let notOptedFollowUp = 0;

    for (const a of list) {
      const status = (a.status || "").toUpperCase();
      const isFeeDone =
        a.isFeeCollected === true ||
        (typeof a.totalPaid === "number" && a.totalPaid > 0 && status === "COMPLETED");

      if (isFeeDone || status === "COMPLETED") {
        completed++;
      } else if (status === "COLLECT_FEE" || status === "PAYMENT_PENDING") {
        collectFee++;
      } else if (status === "IN_CONSULTATION" || status === "ACTIVE") {
        inConsultation++;
      } else {
        waiting++;
      }

      if (
        (a as any).isFollowUpBooked ||
        (a as any).followUpOpted === true ||
        (a.followUpDate && a.followUpDate.trim().length > 0)
      ) {
        optedFollowUp++;
      } else {
        notOptedFollowUp++;
      }
    }

    return NextResponse.json({
      success: true,
      branch: cleanBranch,
      date,
      summary: {
        total: list.length,
        waiting,
        inConsultation,
        collectFee,
        completed,
        optedFollowUp,
        notOptedFollowUp,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch appointment summary" },
      { status: 500 }
    );
  }
}
