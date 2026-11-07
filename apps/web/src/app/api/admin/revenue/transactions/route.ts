import { NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export interface TransactionRecord {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  branchName: string;
  doctorName: string;
  revenueSplit: string;
  source: string;
  consultationFee: number;
  medicineFee: number;
  packageFee: number;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "split";
  splitDetails?: { cash: number; upi: number };
  timestamp: string;
  dateTime: string;
  status: "PAID" | "PENDING" | "COMPLETED";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const appointments = await appointmentService.getAppointments(
      undefined,
      undefined,
      undefined,
      false
    );

    const paidAppointments = appointments.filter(
      (a) =>
        a.isFeeCollected ||
        a.status === "COMPLETED" ||
        (a.totalAmountDue && a.totalAmountDue > 0) ||
        (a.consultationFee && a.consultationFee > 0)
    );

    const realTransactions: TransactionRecord[] = paidAppointments.map((a) => {
      const cFee = a.consultationFee || 0;
      const mFee = a.medicineFee || 0;
      const dFee = a.dietPlanFee || 0;
      const total =
        a.totalAmountDue && a.totalAmountDue > 0
          ? a.totalAmountDue
          : cFee + mFee + dFee || 500;

      let split = "Consultation";
      if (dFee > 0) split = "Diet Plan";
      else if (mFee > 0 && cFee > 0) split = "Consultation & Medicine Fee";
      else if (mFee > 0) split = "Medicine Fee";
      else if (total >= 5000) split = "Package";

      let method: "cash" | "upi" | "card" | "split" = "upi";
      const rawMethod = (a.paymentMethod || "").toUpperCase();
      if (rawMethod.includes("CASH")) method = "cash";
      else if (rawMethod.includes("CARD")) method = "card";
      else if (rawMethod.includes("SPLIT")) method = "split";

      const dt = a.appointmentDate || a.createdAt.split("T")[0];

      return {
        id: a.id || `TXN-${a.token}`,
        patientId: a.registrationId || a.token || "SPH-GEN",
        patientName: a.patientName || "Patient",
        phone: a.phone || "N/A",
        branchName: a.branch || "KPHB Branch",
        doctorName: a.doctorName || "Dr. Prashanth K Vaidya",
        revenueSplit: split,
        source: a.marketingSource || "Walk-in",
        consultationFee: cFee,
        medicineFee: mFee,
        packageFee: dFee,
        totalAmount: total,
        paymentMethod: method,
        timestamp: dt,
        dateTime: `${dt}, ${a.timeSlot || "10:00 AM"}`,
        status: (a.isFeeCollected || a.status === "COMPLETED" ? "PAID" : "PENDING") as any,
      };
    });

    return NextResponse.json(realTransactions);
  } catch (err: any) {
    return NextResponse.json([]);
  }
}

