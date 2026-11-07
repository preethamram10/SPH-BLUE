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
  timestamp: string; // YYYY-MM-DD
  dateTime: string;
  status: "PAID" | "PENDING" | "COMPLETED";
}

function normalizeDateToYYYYMMDD(dt?: string | null): string {
  if (!dt) return "";
  const trimmed = dt.trim();
  if (trimmed.includes("T")) return trimmed.split("T")[0];
  const clean = trimmed.replace(/\//g, "-");
  const parts = clean.split("-");
  // YYYY-MM-DD
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  // DD-MM-YYYY
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return clean;
}

export async function GET(req: Request) {
  try {
    const appointments = await appointmentService.getAppointments(
      undefined,
      undefined,
      undefined,
      false
    );

    // Filter appointments that have been completed or paid
    const paidAppointments = appointments.filter((a) => {
      if (a.isDeleted || a.status === "CANCELLED") return false;

      return (
        a.isFeeCollected ||
        a.status === "COMPLETED" ||
        Boolean(a.paidAt) ||
        (typeof a.totalPaid === "number" && a.totalPaid > 0) ||
        (typeof a.totalAmountDue === "number" && a.totalAmountDue > 0) ||
        (typeof a.consultationFee === "number" && a.consultationFee > 0) ||
        (typeof a.medicineFee === "number" && a.medicineFee > 0)
      );
    });

    const realTransactions: TransactionRecord[] = paidAppointments.map((a) => {
      const cFee = Number(a.consultationFee) || 0;
      const mFee = Number(a.medicineFee) || 0;
      const dFee = Number(a.dietPlanFee) || 0;
      const oFee = Number(a.otherCharges) || 0;
      const disc = Number(a.discountApproved || a.discount) || 0;

      let total = 0;
      if (typeof a.totalPaid === "number" && a.totalPaid > 0) {
        total = a.totalPaid;
      } else if (typeof a.totalAmountDue === "number" && a.totalAmountDue > 0) {
        total = a.totalAmountDue;
      } else {
        total = Math.max(0, cFee + mFee + dFee + oFee - disc);
      }

      if (total <= 0 && (a.isFeeCollected || a.status === "COMPLETED")) {
        total = cFee + mFee + dFee || 500;
      }

      let split = "Consultation";
      if (dFee > 0) split = "Diet Plan";
      else if (mFee > 0 && cFee > 0) split = "Consultation & Medicine Fee";
      else if (mFee > 0) split = "Medicine Fee";
      else if (total >= 5000) split = "Package";
      else if (a.notes && a.notes.toLowerCase().includes("package")) split = "Package";

      let method: "cash" | "upi" | "card" | "split" = "upi";
      const rawMethod = (a.paymentMethod || "").toUpperCase();
      if (rawMethod.includes("CASH")) method = "cash";
      else if (rawMethod.includes("CARD")) method = "card";
      else if (rawMethod.includes("SPLIT")) method = "split";
      else if (
        rawMethod.includes("UPI") ||
        rawMethod.includes("ONLINE") ||
        rawMethod.includes("COUNTER")
      ) {
        method = "upi";
      }

      // Determine clean date: paidAt first, then appointmentDate, then createdAt
      const rawDate = a.paidAt || a.appointmentDate || a.createdAt;
      const dt =
        normalizeDateToYYYYMMDD(rawDate) ||
        new Date().toISOString().split("T")[0];

      let formattedTime = a.timeSlot || "10:00 AM";
      if (a.paidAt) {
        try {
          const pDate = new Date(a.paidAt);
          if (!isNaN(pDate.getTime())) {
            formattedTime = pDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          }
        } catch {}
      }

      const isPaid =
        a.isFeeCollected || Boolean(a.paidAt) || a.status === "COMPLETED";

      return {
        id: a.id || `TXN-${a.token || Math.random().toString(36).substring(2, 7)}`,
        patientId: a.registrationId || a.token || "SPH-PAT",
        patientName: a.patientName || "Patient",
        phone: a.phone || "N/A",
        branchName: a.branch || "Clinic Branch",
        doctorName: a.doctorName || "Dr. Prashanth K Vaidya",
        revenueSplit: split,
        source: a.marketingSource || "Walk-in",
        consultationFee: cFee,
        medicineFee: mFee,
        packageFee: dFee,
        totalAmount: total,
        paymentMethod: method,
        timestamp: dt,
        dateTime: `${dt}, ${formattedTime}`,
        status: isPaid ? "PAID" : "PENDING",
      };
    });

    return NextResponse.json(realTransactions);
  } catch (err: any) {
    return NextResponse.json([]);
  }
}
