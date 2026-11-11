import { NextRequest, NextResponse } from "next/server";
import { payLaterService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const status = searchParams.get("status") || undefined;
    const isSummary = searchParams.get("summary") === "true";
    const phone = searchParams.get("phone") || undefined;

    if (isSummary) {
      const summary = await payLaterService.getSummary(branch);
      return NextResponse.json({ success: true, summary });
    }

    if (phone) {
      const records = await payLaterService.getPendingByPatient(phone);
      const pendingTotal = records.reduce((acc, r) => acc + (Number(r.pendingAmount) || 0), 0);
      return NextResponse.json({ success: true, records, pendingTotal });
    }

    const records = await payLaterService.getAll(branch, status);
    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    console.error("GET /api/pay-later error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch pay later records" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "MANUAL_SETTLE") {
      const { id, amount, invoiceId } = body;
      if (!id || !amount) {
        return NextResponse.json(
          { success: false, error: "Record ID and Amount are required to settle balance." },
          { status: 400 }
        );
      }
      const settled = await payLaterService.manualSettle(id, Number(amount), invoiceId);
      if (!settled) {
        return NextResponse.json(
          { success: false, error: "Pay Later record not found." },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Successfully settled ₹${amount} for ${settled.patientName}.`,
        record: settled,
      });
    }

    if (action === "CREATE") {
      const {
        patientName,
        phone,
        branch,
        originalBillAmount,
        amountPaid,
        pendingAmount,
        dueDate,
        notes,
        registrationId,
        appointmentId,
        invoiceId,
      } = body;

      if (!patientName || !phone || !pendingAmount) {
        return NextResponse.json(
          { success: false, error: "Patient Name, Phone, and Pending Amount are required." },
          { status: 400 }
        );
      }

      const newRecord = await payLaterService.createPayLater({
        patientName,
        phone,
        branch: branch || "KPHB Branch",
        registrationId,
        appointmentId,
        invoiceId,
        originalBillAmount: Number(originalBillAmount) || 0,
        amountPaid: Number(amountPaid) || 0,
        pendingAmount: Number(pendingAmount) || 0,
        visitDate: new Date().toISOString(),
        dueDate,
        notes,
      });

      return NextResponse.json({
        success: true,
        message: `Pay later recorded for ${patientName}.`,
        record: newRecord,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/pay-later error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process pay later request" },
      { status: 500 }
    );
  }
}

