import { NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export interface TransactionRecord {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  branchName: string;
  doctorName: string;
  paymentType?: string;
  revenueSplit: string;
  source: string;
  consultationFee: number;
  medicineFee: number;
  packageFee: number;
  dietFee: number;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "split" | "counter_upi";
  displayPaymentMethod?: string;
  splitDetails?: { cash?: number; upi?: number; card?: number; counterUpi?: number };
  consultationMode?: "In-Clinic" | "Online" | string;
  timestamp: string; // YYYY-MM-DD
  dateTime: string;
  status: "PAID" | "PENDING" | "COMPLETED";
}

function formatTransactionDateTime(a: any): { timestamp: string; dateTime: string } {
  // 1. Determine clean date (YYYY-MM-DD for sorting/filtering, and DD/MM/YYYY for display)
  let yyyy_mm_dd = "";
  let dd_mm_yyyy = "";

  const rawDateStr = a.appointmentDate || a.paidAt || a.createdAt;
  if (rawDateStr) {
    const trimmed = String(rawDateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-");
      yyyy_mm_dd = trimmed;
      dd_mm_yyyy = `${d}/${m}/${y}`;
    } else if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[/-]/);
      const [d, m, y] = parts;
      yyyy_mm_dd = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      dd_mm_yyyy = `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    } else {
      try {
        const pDate = new Date(trimmed);
        if (!isNaN(pDate.getTime())) {
          const parts = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(pDate);
          const day = parts.find((p) => p.type === "day")?.value || "01";
          const month = parts.find((p) => p.type === "month")?.value || "01";
          const year = parts.find((p) => p.type === "year")?.value || "2026";
          yyyy_mm_dd = `${year}-${month}-${day}`;
          dd_mm_yyyy = `${day}/${month}/${year}`;
        }
      } catch {}
    }
  }

  if (!yyyy_mm_dd) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const day = parts.find((p) => p.type === "day")?.value || "01";
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const year = parts.find((p) => p.type === "year")?.value || "2026";
    yyyy_mm_dd = `${year}-${month}-${day}`;
    dd_mm_yyyy = `${day}/${month}/${year}`;
  }

  // 2. Clean Time in IST (12-hour hh:mm A)
  let timeStr = "";
  if (a.timeSlot && typeof a.timeSlot === "string" && a.timeSlot.trim()) {
    const rawSlot = a.timeSlot.trim();
    if (rawSlot.includes("-")) {
      timeStr = rawSlot.split("-")[0].trim();
    } else {
      timeStr = rawSlot;
    }
  } else if (a.paidAt) {
    try {
      const pDate = new Date(a.paidAt);
      if (!isNaN(pDate.getTime())) {
        const formatted = pDate.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        if (formatted !== "05:30 AM" && !String(a.paidAt).includes("T00:00:00")) {
          timeStr = formatted;
        }
      }
    } catch {}
  }

  if (!timeStr && a.createdAt) {
    try {
      const cDate = new Date(a.createdAt);
      if (!isNaN(cDate.getTime())) {
        const formatted = cDate.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        if (formatted !== "05:30 AM" && !String(a.createdAt).includes("T00:00:00")) {
          timeStr = formatted;
        }
      }
    } catch {}
  }

  if (!timeStr) {
    timeStr = "10:00 AM";
  }

  return {
    timestamp: yyyy_mm_dd,
    dateTime: `${dd_mm_yyyy}, ${timeStr}`,
  };
}

function isHistoricalOrUploadPlaceholder(a: any): boolean {
  if (a.isHistorical) return true;
  const src = (a.marketingSource || "").toLowerCase();
  const notes = ((a.diagnosisNotes || "") + " " + (a.notes || "")).toLowerCase();
  if (
    src.includes("historical") ||
    src.includes("old record") ||
    src.includes("old entry") ||
    src.includes("uploaded") ||
    notes.includes("historical prescription") ||
    notes.includes("historical entry") ||
    notes.includes("uploaded prescription")
  ) {
    return true;
  }
  // If record has zero paid amount, no invoice, and no fee declared, it's an uploaded placeholder
  const hasPaymentRecord =
    (typeof a.totalPaid === "number" && a.totalPaid > 0) ||
    Boolean(a.invoiceId) ||
    Boolean(a.paidAt);
  const hasFeeDeclared =
    (typeof a.consultationFee === "number" && a.consultationFee > 0) ||
    (typeof a.medicineFee === "number" && a.medicineFee > 0) ||
    (typeof a.totalAmountDue === "number" && a.totalAmountDue > 0);

  if (!hasPaymentRecord && !hasFeeDeclared) {
    return true;
  }
  return false;
}

function normalizeDoctorDisplayName(doc?: string): string {
  if (!doc || typeof doc !== "string") return "Dr. Prashant K Vaidya";
  const trimmed = doc.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes("vaidya") || lower.includes("prashant") || lower.includes("prasanth")) {
    return "Dr. Prashant K Vaidya";
  }
  if (lower.includes("ramakrishna") || lower.includes("chanduri")) {
    return "Dr. Ramakrishna Chanduri";
  }
  if (lower.includes("jobeadh") || lower.includes("parveej")) {
    return "Dr. Jobeadh Parveej";
  }
  if (lower.includes("padma") || lower.includes("priya")) {
    return "Dr. Padma Priya";
  }
  return trimmed;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();
    const month = searchParams.get("month")?.trim();
    const year = searchParams.get("year")?.trim();
    const branchFilter = searchParams.get("branch")?.trim().toLowerCase();
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;

    // Use decorate = false to bypass heavy visit history / package decoration for ledger calculation
    const appointments = await appointmentService.getAppointments(
      undefined,
      undefined,
      undefined,
      false,
      false
    );

    // Filter appointments that have been completed or paid WITH REAL REVENUE
    // Exclude uploaded files, old historical placeholders, and $0 entries
    const paidAppointments = appointments.filter((a) => {
      if (a.isDeleted || a.status === "CANCELLED") return false;

      // 1. Exclude all uploaded file placeholders & historical record entries
      if (isHistoricalOrUploadPlaceholder(a)) return false;

      // 2. Compute exact billable / collected amount
      const cFee = Number(a.consultationFee) || 0;
      const mFee = Number(a.medicineFee) || 0;
      const dFee = Number(a.dietPlanFee || (a as any).dietFee) || 0;
      const oFee = Number(a.otherCharges) || 0;
      const disc = Number(a.discountApproved || a.discount) || 0;

      const isPkg = Boolean(
        (a as any).hasPackage ||
        (a as any).activePackage ||
        (a as any).packageTotalAmount ||
        (a as any).packageName ||
        (a as any).packageInstallmentPaid ||
        (a as any).billingMode === "package" ||
        (a as any).paymentType === "package"
      );
      const pkgAmount = Number((a as any).packageInstallmentPaid || (a as any).packageTotalAmount || 0);

      let total = 0;
      if (typeof a.totalPaid === "number" && a.totalPaid > 0) {
        total = a.totalPaid;
      } else if (typeof a.totalAmountDue === "number" && a.totalAmountDue > 0) {
        total = a.totalAmountDue;
      } else if (isPkg && pkgAmount > 0) {
        total = pkgAmount;
      } else {
        total = Math.max(0, cFee + mFee + dFee + oFee - disc);
      }

      // Must have actual collected or due revenue > 0
      if (total <= 0) return false;

      // Must be paid, fee collected, or completed with real payment
      return (
        a.isFeeCollected === true ||
        Boolean(a.paidAt) ||
        Boolean(a.invoiceId) ||
        (typeof a.totalPaid === "number" && a.totalPaid > 0) ||
        (a.status === "COMPLETED" && (cFee > 0 || mFee > 0 || isPkg))
      );
    });

    const realTransactions: TransactionRecord[] = paidAppointments.map((a) => {
      const cFee = Number(a.consultationFee) || 0;
      const mFee = Number(a.medicineFee) || 0;
      const dFee = Number(a.dietPlanFee || (a as any).dietFee) || 0;
      const oFee = Number(a.otherCharges) || 0;
      const disc = Number(a.discountApproved || a.discount) || 0;

      const isPkg = Boolean(
        (a as any).hasPackage ||
        (a as any).activePackage ||
        (a as any).packageTotalAmount ||
        (a as any).packageName ||
        (a as any).packageInstallmentPaid ||
        (a as any).billingMode === "package" ||
        (a as any).paymentType === "package"
      );
      const pkgAmount = Number((a as any).packageInstallmentPaid || (a as any).packageTotalAmount || 0);

      let total = 0;
      if (typeof a.totalPaid === "number" && a.totalPaid > 0) {
        total = a.totalPaid;
      } else if (typeof a.totalAmountDue === "number" && a.totalAmountDue > 0) {
        total = a.totalAmountDue;
      } else if (isPkg && pkgAmount > 0) {
        total = pkgAmount;
      } else {
        total = Math.max(0, cFee + mFee + dFee + oFee - disc);
      }

      const pType = (a as any).paymentType;
      let split = "Consultation";
      if (pType === "package" || isPkg || (a.notes && a.notes.toLowerCase().includes("package"))) {
        split = "Package";
      } else if (pType === "consult_and_med") {
        split = "Consultation & Medicine";
      } else if (pType === "consultation") {
        split = "Consultation";
      } else if (pType === "split") {
        split = "Consultation & Medicine";
      } else if (dFee > 0 && cFee === 0 && mFee === 0) {
        split = "Diet Plan";
      } else if (mFee > 0 && cFee > 0) {
        split = "Consultation & Medicine";
      } else if (mFee > 0) {
        split = "Consultation & Medicine";
      } else if (dFee > 0) {
        split = "Diet Plan";
      } else if (total >= 5000) {
        split = "Package";
      } else {
        split = "Consultation";
      }

      let method: "cash" | "upi" | "card" | "split" | "counter_upi" = "upi";
      const rawMethod = (a.paymentMethod || (a as any).paymentMode || "").toUpperCase();
      if (rawMethod.includes("COUNTER")) {
        method = "counter_upi";
      } else if (rawMethod.includes("CASH")) {
        method = "cash";
      } else if (rawMethod.includes("CARD")) {
        method = "card";
      } else if (rawMethod.includes("SPLIT")) {
        method = "split";
      } else if (
        rawMethod.includes("UPI") ||
        rawMethod.includes("ONLINE") ||
        rawMethod.includes("QR")
      ) {
        method = "upi";
      }

      let displayMethod = "UPI";
      if (rawMethod.includes("COUNTER")) {
        displayMethod = "Counter UPI";
      } else if (rawMethod.includes("ONLINE") || rawMethod.includes("QR")) {
        displayMethod = "UPI / QR Code";
      } else if (rawMethod.includes("CASH")) {
        displayMethod = "Cash";
      } else if (rawMethod.includes("CARD")) {
        displayMethod = "Card";
      } else if (rawMethod.includes("SPLIT")) {
        displayMethod = "Split";
        if ((a as any).splitDetails) {
          const parts: string[] = [];
          if ((a as any).splitDetails.cash) parts.push(`Cash ₹${(a as any).splitDetails.cash}`);
          if ((a as any).splitDetails.counterUpi) parts.push(`Counter UPI ₹${(a as any).splitDetails.counterUpi}`);
          if ((a as any).splitDetails.upi) parts.push(`UPI ₹${(a as any).splitDetails.upi}`);
          if ((a as any).splitDetails.card) parts.push(`Card ₹${(a as any).splitDetails.card}`);
          if (parts.length > 0) {
            displayMethod = `Split (${parts.join(" + ")})`;
          }
        }
      } else if (rawMethod.includes("APP")) {
        displayMethod = "Send Pay to app";
      } else if (a.paymentMethod) {
        displayMethod = a.paymentMethod;
      }
      const { timestamp: dt, dateTime } = formatTransactionDateTime(a);

      const isPaid =
        a.isFeeCollected || Boolean(a.paidAt) || a.status === "COMPLETED";

      return {
        id: a.id || `TXN-${a.token || Math.random().toString(36).substring(2, 7)}`,
        patientId: a.registrationId || a.token || "SPH-PAT",
        patientName: a.patientName || "Patient",
        phone: a.phone || "N/A",
        branchName: a.branch || "Clinic Branch",
        doctorName: normalizeDoctorDisplayName(a.doctorName || (a as any).doctor),
        paymentType: pType || (isPkg ? "package" : (split === "Consultation & Medicine" ? "consult_and_med" : "consultation")),
        revenueSplit: split,
        source: (a.marketingSource || (a as any).source || (a as any).patientSource || "Walk-in").trim(),
        consultationFee: isPkg ? 0 : cFee,
        medicineFee: isPkg ? 0 : mFee,
        packageFee: isPkg ? total : (total >= 5000 ? total : 0),
        dietFee: dFee,
        totalAmount: total,
        paymentMethod: method,
        displayPaymentMethod: displayMethod,
        splitDetails: (a as any).splitDetails,
        consultationMode: (a.consultationMode || (a as any).mode || "").toLowerCase().includes("online") ? "Online" : "In-Clinic",
        timestamp: dt,
        dateTime,
        status: isPaid ? "PAID" : "PENDING",
      };
    });

    // Sort newest transactions first
    realTransactions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    let filtered = realTransactions;

    if (branchFilter && branchFilter !== "all" && branchFilter !== "all branches") {
      filtered = filtered.filter((t) => t.branchName.toLowerCase().includes(branchFilter));
    }

    if (startDate) {
      filtered = filtered.filter((t) => t.timestamp >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((t) => t.timestamp <= endDate);
    }
    if (month) {
      // YYYY-MM
      filtered = filtered.filter((t) => t.timestamp.startsWith(month));
    }
    if (year) {
      // YYYY
      filtered = filtered.filter((t) => t.timestamp.startsWith(year));
    }

    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return NextResponse.json(filtered);
  } catch (err: any) {
    return NextResponse.json([]);
  }
}
