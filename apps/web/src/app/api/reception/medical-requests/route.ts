import { NextRequest, NextResponse } from "next/server";
import { medicineRequestService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const status = searchParams.get("status") || undefined;

    const requests = await medicineRequestService.getAllRequests(branch, status);
    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    console.error("GET /api/reception/medical-requests error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch medical requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Update Status Action
    if (body.action === "UPDATE_STATUS") {
      const { id, status } = body;
      if (!id || !status) {
        return NextResponse.json(
          { success: false, error: "Missing id or status for update." },
          { status: 400 }
        );
      }
      const updated = await medicineRequestService.updateRequestStatus(id, status);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Medical request not found." },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Status updated to ${status}.`,
        request: updated,
      });
    }

    // 2. Delete Action
    if (body.action === "DELETE") {
      const { id } = body;
      if (!id) {
        return NextResponse.json(
          { success: false, error: "Missing id for deletion." },
          { status: 400 }
        );
      }
      const deleted = await medicineRequestService.deleteRequest(id);
      return NextResponse.json({
        success: deleted,
        message: deleted ? "Request removed." : "Request not found.",
      });
    }

    // 3. Create New Medical Request
    const {
      patientName,
      phone,
      gender,
      age,
      branchName,
      duration,
      totalAmount,
      medicines,
      deliveryAddress,
      notes,
    } = body;

    if (!patientName || !patientName.trim()) {
      return NextResponse.json(
        { success: false, error: "Patient Full Name is required." },
        { status: 400 }
      );
    }

    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "A valid 10-digit phone number is required." },
        { status: 400 }
      );
    }

    const validMedicines = Array.isArray(medicines)
      ? medicines.filter((m: any) => m && m.name && m.name.trim().length > 0)
      : [];

    if (validMedicines.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one prescribed medicine remedy is required." },
        { status: 400 }
      );
    }

    const newRequest = await medicineRequestService.createRequest({
      patientName: patientName.trim(),
      phone: cleanPhone,
      gender: gender || "Mr.",
      age: age ? String(age).trim() : undefined,
      branchName: branchName || "KPHB Branch",
      duration: duration || "1 Month",
      totalAmount: typeof totalAmount === "number" ? totalAmount : parseFloat(totalAmount) || 0,
      medicines: validMedicines,
      deliveryAddress: deliveryAddress ? deliveryAddress.trim() : undefined,
      notes: notes && typeof notes === "string" ? notes.trim() : undefined,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      message: `Medical request ${newRequest.requestId} created successfully.`,
      request: newRequest,
      id: newRequest.id,
      requestId: newRequest.requestId,
    });
  } catch (error: any) {
    console.error("POST /api/reception/medical-requests error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process medical request" },
      { status: 500 }
    );
  }
}

