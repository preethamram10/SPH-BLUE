import { NextRequest, NextResponse } from "next/server";
import { cleaningTaskService } from "@spiritualhomeo/database";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const task = await cleaningTaskService.getTaskById(id);

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Cleaning task not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch task." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action } = body;

    // 1. Reception Submits Photos for Verification
    if (action === "SUBMIT") {
      const { fieldsData, submittedBy } = body;
      const updated = await cleaningTaskService.submitPhotosForVerification(
        id,
        fieldsData || [],
        submittedBy || "Reception"
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Cleaning task not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        task: updated,
        message: "Cleaning photos submitted for Admin / HR verification.",
      });
    }

    // 2. Admin / HR Reviews Task (Approve or Reject)
    if (action === "REVIEW") {
      const { reviewAction, reviewedBy, reviewedRole, remarks, rejectedFieldIds, fieldRemarks } = body;

      const updated = await cleaningTaskService.reviewTask(id, {
        action: reviewAction === "APPROVE" ? "APPROVE" : "REJECT",
        reviewedBy: reviewedBy || "Admin / HR",
        reviewedRole: reviewedRole || "ADMIN",
        remarks,
        rejectedFieldIds,
        fieldRemarks,
      });

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Cleaning task not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        task: updated,
        message:
          reviewAction === "APPROVE"
            ? "Cleaning audit approved! Reception unlocked."
            : "Cleaning audit rejected. Reception notified to re-upload.",
      });
    }

    // 3. Generic Update
    const updated = await cleaningTaskService.updateTask(id, body);
    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update cleaning task." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = await cleaningTaskService.deleteTask(id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete task." },
      { status: 500 }
    );
  }
}

