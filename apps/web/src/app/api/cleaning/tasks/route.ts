import { NextRequest, NextResponse } from "next/server";
import { cleaningTaskService, toDDMMYYYY } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchName = searchParams.get("branchName") || undefined;
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;

    const tasks = await cleaningTaskService.getAllTasks({
      branchName,
      date: date ? toDDMMYYYY(date) : undefined,
      status,
    });

    return NextResponse.json({
      success: true,
      tasks,
      total: tasks.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch cleaning tasks." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branchId, branchName, assignedDate, assignedBy, assignedRole, fieldNames } = body;

    if (!branchName) {
      return NextResponse.json(
        { success: false, error: "Branch name is required." },
        { status: 400 }
      );
    }

    if (!assignedDate) {
      return NextResponse.json(
        { success: false, error: "Assigned date (DD-MM-YYYY) is required." },
        { status: 400 }
      );
    }

    const fieldsList = Array.isArray(fieldNames) && fieldNames.length > 0
      ? fieldNames
      : ["Bathroom", "Reception Front Desk", "Waiting Lounge / Sitting Area"];

    const task = await cleaningTaskService.createTask({
      branchId,
      branchName,
      assignedDate: toDDMMYYYY(assignedDate),
      assignedBy: assignedBy || "Admin / HR",
      assignedRole: assignedRole || "ADMIN",
      fieldNames: fieldsList,
    });

    return NextResponse.json({
      success: true,
      task,
      message: `Cleaning inspection successfully assigned for ${task.assignedDate}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create cleaning task." },
      { status: 500 }
    );
  }
}

