import { NextRequest, NextResponse } from "next/server";
import { sharedMediaService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

// GET /api/shared-media: Get all folders and links (Global across all branches)
export async function GET(req: NextRequest) {
  try {
    const folders = await sharedMediaService.getAllFolders();
    return NextResponse.json({
      success: true,
      folders,
    });
  } catch (error: any) {
    console.error("GET /api/shared-media error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load shared media" },
      { status: 500 }
    );
  }
}

// POST /api/shared-media: Create folder OR Add link to folder
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_folder") {
      const { name, description, color, createdBy, createdBranch } = body;
      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "Folder name is required" },
          { status: 400 }
        );
      }
      const folder = await sharedMediaService.createFolder({
        name,
        description,
        color,
        createdBy,
        createdBranch,
      });
      return NextResponse.json({ success: true, folder });
    }

    if (action === "add_link") {
      const { folderId, name, url, createdBy, createdBranch } = body;
      if (!folderId) {
        return NextResponse.json(
          { success: false, error: "folderId is required" },
          { status: 400 }
        );
      }
      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "Link name is required" },
          { status: 400 }
        );
      }
      if (!url || !url.trim()) {
        return NextResponse.json(
          { success: false, error: "Valid URL or link is required" },
          { status: 400 }
        );
      }

      const link = await sharedMediaService.addLinkToFolder(folderId, {
        name,
        url,
        createdBy,
        createdBranch,
      });

      if (!link) {
        return NextResponse.json(
          { success: false, error: "Folder not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, link });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Expected 'create_folder' or 'add_link'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("POST /api/shared-media error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process shared media request" },
      { status: 500 }
    );
  }
}

// DELETE /api/shared-media: Delete a folder or link
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const linkId = searchParams.get("linkId");

    if (!folderId) {
      return NextResponse.json(
        { success: false, error: "folderId is required" },
        { status: 400 }
      );
    }

    if (linkId) {
      // Delete single link inside folder
      const deleted = await sharedMediaService.deleteLinkFromFolder(folderId, linkId);
      return NextResponse.json({ success: deleted });
    } else {
      // Delete whole folder
      const deleted = await sharedMediaService.deleteFolder(folderId);
      return NextResponse.json({ success: deleted });
    }
  } catch (error: any) {
    console.error("DELETE /api/shared-media error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete item" },
      { status: 500 }
    );
  }
}
