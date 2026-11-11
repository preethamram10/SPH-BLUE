import { NextRequest, NextResponse } from "next/server";
import { packageService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const search = searchParams.get("search") || "";

    let members = await packageService.getAllPackageMembers(branch);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      members = members.filter(
        (m: any) =>
          (m.patientName || "").toLowerCase().includes(q) ||
          (m.phone || "").includes(q) ||
          (m.registrationId || "").toLowerCase().includes(q) ||
          (m.packageName || "").toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      members,
      totalCount: members.length,
    });
  } catch (error: any) {
    console.error("GET /api/package-members error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch package members" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = "register" } = body;

    if (action === "payment") {
      const { packageId, amount, paymentMethod, appointmentId, invoiceId, notes } = body;
      if (!packageId || amount === undefined) {
        return NextResponse.json(
          { success: false, error: "packageId and amount are required for payment" },
          { status: 400 }
        );
      }

      const updated = await packageService.recordPackagePayment(packageId, {
        amount: Number(amount) || 0,
        paymentMethod: paymentMethod || "CASH",
        appointmentId,
        invoiceId,
        notes: notes || "Package installment payment",
      });

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Package member record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        member: updated,
        message: `Payment of ₹${amount} recorded successfully. Remaining balance: ₹${updated.pendingAmount}`,
      });
    }

    // Default: action === "register"
    const {
      registrationId,
      patientName,
      phone,
      branch,
      durationMonths,
      totalAmount,
      initialPaidAmount,
      paymentMethod,
      appointmentId,
      notes,
    } = body;

    if (!patientName || !phone) {
      return NextResponse.json(
        { success: false, error: "Patient name and phone are required" },
        { status: 400 }
      );
    }

    const member = await packageService.registerPackage({
      registrationId: registrationId || "",
      patientName,
      phone,
      branch: branch || "Clinic Branch",
      durationMonths: Number(durationMonths) || 1,
      totalAmount: Number(totalAmount) || 0,
      initialPaidAmount: Number(initialPaidAmount) || 0,
      paymentMethod: paymentMethod || "CASH",
      appointmentId,
      notes,
    });

    return NextResponse.json({
      success: true,
      member,
      message: `Package registered successfully for ${patientName}!`,
    });
  } catch (error: any) {
    console.error("POST /api/package-members error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process package request" },
      { status: 500 }
    );
  }
}

