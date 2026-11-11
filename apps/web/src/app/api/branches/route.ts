import { NextRequest, NextResponse } from "next/server";
import { branchService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

// GET /api/branches
export async function GET() {
  try {
    // Run store synchronization to ensure existing records match canonical branch names
    branchService.syncAllStoresToCanonicalBranches();

    const branches = await branchService.getAllBranches();

    return NextResponse.json(
      {
        success: true,
        count: branches.length,
        data: branches,
        branches: branches,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch branches", data: [], branches: [] },
      { status: 500 }
    );
  }
}

// POST /api/branches
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, address, city, timings, photoUrl, photoName } = body;

    if (!name || !phone || !address) {
      return NextResponse.json(
        { success: false, error: "Name, phone, and address are required" },
        { status: 400 }
      );
    }

    const createdBranch = await branchService.createBranch({
      name,
      phone,
      address,
      city,
      timings,
      photoUrl,
      photoName,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Branch created successfully",
        data: createdBranch,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create branch" },
      { status: 500 }
    );
  }
}

// PUT /api/branches (Update Branch)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, phone, address, city, timings, photoUrl, photoName, doctorsCount, isActive } =
      body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Branch ID is required" },
        { status: 400 }
      );
    }

    const updated = await branchService.updateBranch(id, {
      name,
      phone,
      address,
      city,
      timings,
      photoUrl,
      photoName,
      doctorsCount,
      isActive,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Branch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Branch updated successfully",
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update branch" },
      { status: 500 }
    );
  }
}

// DELETE /api/branches?id=123
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Branch ID is required" },
        { status: 400 }
      );
    }

    await branchService.deleteBranch(id);

    return NextResponse.json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete branch" },
      { status: 500 }
    );
  }
}
