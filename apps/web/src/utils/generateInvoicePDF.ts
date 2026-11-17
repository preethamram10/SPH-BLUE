import { getBranchPhone } from "@/app/reception/medical-requests/pdf/generateMedicineRequestPDF";

export interface InvoiceReceiptPDFData {
  invoiceId?: string;
  patientName: string;
  phone?: string;
  doctorName?: string;
  branch?: string;
  appointmentDate?: string;
  timeSlot?: string;
  totalPaid?: number | string;
  totalAmountDue?: number | string;
  payLaterAmount?: number | string;
  paymentMode?: string;
  paymentMethod?: string;
  consultationFee?: number | string;
  medicineFee?: number | string;
  medicineDuration?: string;
  medicines?: Array<{ name?: string; type?: string; timing?: string; amount?: number | string }>;
  medicinesList?: Array<{ name?: string; type?: string; timing?: string; amount?: number | string }>;
  dietFee?: number | string;
  dietPlanFee?: number | string;
  otherCharges?: number | string;
  previousDuePaid?: number | string;
  discount?: number | string;
  discountReason?: string;
  packageName?: string;
  hasPackage?: boolean;
  packageInstallmentPaid?: number | string;
  paidAt?: string;
}

function escapePdfText(text: string): string {
  return String(text || "")
    .split("\\")
    .join("\\\\")
    .split("(")
    .join("\\(")
    .split(")")
    .join("\\)");
}

function formatPaymentMode(mode: string = ""): string {
  const upper = (mode || "").toUpperCase();
  if (upper.includes("UPI")) return "UPI";
  if (upper.includes("CASH")) return "CASH";
  if (upper.includes("CARD")) return "CARD";
  return upper || "UPI";
}

/**
 * Builds an official ISO-32000 compliant A4 PDF document for Payment Receipt & Tax Invoice.
 */
export function buildInvoicePDFBlob(inv: InvoiceReceiptPDFData): Blob {
  const invoiceNum = inv.invoiceId || "INV-RECEIPT";
  const cleanPhone = String(inv.phone || "").replace(/\D/g, "").slice(-10) || "On Record";
  const branchName = inv.branch || "KPHB Branch";
  const branchPhone = getBranchPhone(branchName);
  const doctorName = inv.doctorName || "Dr. Prashanth K Vaidya";
  const dateStr = inv.appointmentDate || new Date().toISOString().slice(0, 10);
  const timeStr = inv.timeSlot ? ` at ${inv.timeSlot}` : "";
  const paymentModeStr = formatPaymentMode(inv.paymentMode || inv.paymentMethod || "UPI");

  const totalPaidNum = Number(inv.totalPaid ?? inv.totalAmountDue ?? 0);
  const payLaterNum = Number(inv.payLaterAmount || 0);
  const isPartial = payLaterNum > 0;
  const totalBillNum = Number(inv.totalAmountDue || (totalPaidNum + payLaterNum));

  const commands: string[] = [
    "q",
    // Top header border (Clinic Accent Green)
    "0.52 0.80 0.09 rg",
    "40 790 515 4 re f",

    // Header Title
    "0.06 0.09 0.16 rg",
    `BT /F2 16 Tf 40 805 Td (${escapePdfText("SPIRITUAL HOMEOPATHY CLINICS")}) Tj ET`,
    "0.4 0.45 0.5 rg",
    `BT /F1 9 Tf 40 775 Td (${escapePdfText("Center of Excellence in Classical Homeopathy")}) Tj ET`,

    // Right side clinic contacts
    "0.52 0.80 0.09 rg",
    `BT /F2 11 Tf 360 805 Td (${escapePdfText(branchName.toUpperCase())}) Tj ET`,
    "0.3 0.35 0.4 rg",
    `BT /F1 8 Tf 360 792 Td (Tel: ${escapePdfText(branchPhone)}) Tj ET`,
    "BT /F1 8 Tf 360 780 Td (Email: support@spiritualhomeo.com) Tj ET",

    // Title Banner
    "0.96 0.98 0.95 rg",
    "40 735 515 28 re f",
    "0.8 0.88 0.78 RG 1 w",
    "40 735 515 28 re s",

    "0.06 0.09 0.16 rg",
    `BT /F2 12 Tf 165 745 Td (${escapePdfText("OFFICIAL PAYMENT RECEIPT & TAX INVOICE")}) Tj ET`,

    // Patient & Appointment Details Box
    "0.98 0.98 0.99 rg",
    "40 645 515 80 re f",
    "0.85 0.88 0.92 RG 1 w",
    "40 645 515 80 re s",

    "0.4 0.45 0.5 rg",
    "BT /F2 8 Tf 50 710 Td (PATIENT NAME:) Tj ET",
    "BT /F2 8 Tf 310 710 Td (RECEIPT / INVOICE NO:) Tj ET",
    "BT /F2 8 Tf 50 685 Td (CONSULTANT DOCTOR:) Tj ET",
    "BT /F2 8 Tf 310 685 Td (APPOINTMENT SCHEDULE:) Tj ET",
    "BT /F2 8 Tf 50 660 Td (PHONE NUMBER:) Tj ET",
    "BT /F2 8 Tf 310 660 Td (CLINIC BRANCH:) Tj ET",

    "0.06 0.09 0.16 rg",
    `BT /F2 11 Tf 145 710 Td (${escapePdfText(inv.patientName)}) Tj ET`,
    `BT /F2 10 Tf 420 710 Td (${escapePdfText(invoiceNum)}) Tj ET`,
    `BT /F1 9 Tf 160 685 Td (${escapePdfText(doctorName)}) Tj ET`,
    "0.06 0.09 0.16 rg",
    `BT /F1 9 Tf 435 685 Td (${escapePdfText(dateStr + timeStr)}) Tj ET`,
    `BT /F1 9 Tf 145 660 Td (+91 ${escapePdfText(cleanPhone)}) Tj ET`,
    `BT /F1 9 Tf 400 660 Td (${escapePdfText(branchName)}) Tj ET`,
  ];

  // Payment Status Banner Box
  if (isPartial) {
    commands.push(
      "0.99 0.97 0.92 rg",
      "40 585 515 48 re f",
      "0.95 0.75 0.25 RG 1.5 w",
      "40 585 515 48 re s",

      "0.6 0.3 0.0 rg",
      "BT /F2 8 Tf 50 617 Td (AMOUNT PAID TODAY) Tj ET",
      "0.05 0.55 0.25 rg",
      `BT /F2 15 Tf 50 600 Td (INR ${totalPaidNum.toLocaleString("en-IN")}.00) Tj ET`,

      "0.8 0.35 0.0 rg",
      `BT /F2 9 Tf 240 600 Td (REMAINING DUE: INR ${payLaterNum.toLocaleString("en-IN")}.00) Tj ET`,

      "0.9 0.5 0.0 rg",
      "BT /F2 10 Tf 440 613 Td (PARTIAL PAID) Tj ET",
      "0.4 0.45 0.5 rg",
      `BT /F1 8 Tf 440 598 Td (VIA ${escapePdfText(paymentModeStr)}) Tj ET`
    );
  } else {
    commands.push(
      "0.94 0.99 0.95 rg",
      "40 590 515 45 re f",
      "0.52 0.80 0.09 RG 1.5 w",
      "40 590 515 45 re s",

      "0.1 0.5 0.2 rg",
      "BT /F2 9 Tf 50 618 Td (TOTAL AMOUNT PAID) Tj ET",
      `BT /F2 16 Tf 50 599 Td (INR ${totalPaidNum.toLocaleString("en-IN")}.00) Tj ET`,

      "BT /F2 11 Tf 440 613 Td (PAID [VERIFIED]) Tj ET",
      "0.4 0.45 0.5 rg",
      `BT /F1 8 Tf 440 598 Td (VIA ${escapePdfText(paymentModeStr)}) Tj ET`
    );
  }

  // Fee Breakdown Table Header
  let currentY = 555;
  commands.push(
    "0.93 0.95 0.97 rg",
    `40 ${currentY} 515 20 re f`,
    "0.8 0.83 0.88 RG",
    `40 ${currentY} 515 20 re s`,
    "0.2 0.25 0.3 rg",
    `BT /F2 8 Tf 50 ${currentY + 6} Td (DESCRIPTION / FEE PARTICULARS) Tj ET`,
    `BT /F2 8 Tf 460 ${currentY + 6} Td (AMOUNT) Tj ET`
  );

  // Table items
  const items: Array<{ desc: string; sub?: string; amt: number }> = [];

  if (inv.hasPackage || inv.packageName) {
    items.push({
      desc: "Package Treatment Installment",
      sub: inv.packageName || "Treatment Care Package",
      amt: Number(inv.packageInstallmentPaid ?? totalPaidNum),
    });
  } else {
    if (Number(inv.consultationFee) > 0) {
      items.push({ desc: "Consultation Fee", amt: Number(inv.consultationFee) });
    }
    const rawMeds = inv.medicines || inv.medicinesList || [];
    const validMeds = Array.isArray(rawMeds)
      ? rawMeds.filter((m: any) => m && ((m.name && m.name.trim().length > 0) || Number(m.amount) > 0))
      : [];
    if (validMeds.length > 0) {
      validMeds.forEach((m: any) => {
        items.push({
          desc: m.name || (m.type === "Reserve" ? "Reserve Medicine" : "Prescribed Medicine"),
          sub: `${m.type || "Pills"}${m.timing ? ` • ${m.timing}` : ""}`,
          amt: Number(m.amount || 0),
        });
      });
    } else if (Number(inv.medicineFee) > 0) {
      items.push({
        desc: `Medicine Fee (${inv.medicineDuration || "1 Month"})`,
        amt: Number(inv.medicineFee),
      });
    }
  }

  if (Number(inv.dietFee || inv.dietPlanFee) > 0) {
    items.push({ desc: "Diet & Nutrition Care Plan", amt: Number(inv.dietFee || inv.dietPlanFee) });
  }
  if (Number(inv.otherCharges) > 0) {
    items.push({ desc: "Other Clinical Services", amt: Number(inv.otherCharges) });
  }
  if (Number(inv.previousDuePaid) > 0) {
    items.push({ desc: "Previous Pending Balance (Cleared)", amt: Number(inv.previousDuePaid) });
  }

  // Draw rows
  items.forEach((item) => {
    currentY -= 26;
    commands.push(
      "1 1 1 rg",
      `40 ${currentY} 515 26 re f`,
      "0.92 0.94 0.96 RG",
      `40 ${currentY} 515 26 re s`,
      "0.08 0.12 0.18 rg",
      `BT /F2 9 Tf 50 ${currentY + 12} Td (${escapePdfText(item.desc)}) Tj ET`
    );
    if (item.sub) {
      commands.push(
        "0.45 0.5 0.55 rg",
        `BT /F1 7 Tf 50 ${currentY + 3} Td (${escapePdfText(item.sub)}) Tj ET`
      );
    }
    commands.push(
      "0.08 0.12 0.18 rg",
      `BT /F2 9 Tf 450 ${currentY + 10} Td (INR ${item.amt.toLocaleString("en-IN")}.00) Tj ET`
    );
  });

  // Discount row if applied
  if (Number(inv.discount) > 0) {
    currentY -= 22;
    commands.push(
      "1.0 0.96 0.96 rg",
      `40 ${currentY} 515 22 re f`,
      "0.95 0.8 0.8 RG",
      `40 ${currentY} 515 22 re s`,
      "0.75 0.1 0.1 rg",
      `BT /F2 8 Tf 50 ${currentY + 7} Td (Discount Applied (${escapePdfText(inv.discountReason || "Special Waiver")})) Tj ET`,
      `BT /F2 9 Tf 445 ${currentY + 7} Td (- INR ${Number(inv.discount).toLocaleString("en-IN")}.00) Tj ET`
    );
  }

  // Grand Total Summary Row
  currentY -= 28;
  commands.push(
    "0.08 0.12 0.18 rg",
    `40 ${currentY} 515 28 re f`,
    "1 1 1 rg",
    `BT /F2 9 Tf 50 ${currentY + 10} Td (TOTAL PAID VIA ${escapePdfText(paymentModeStr)}) Tj ET`,
    "0.3 0.9 0.4 rg",
    `BT /F2 12 Tf 435 ${currentY + 9} Td (INR ${totalPaidNum.toLocaleString("en-IN")}.00) Tj ET`
  );

  if (isPartial) {
    currentY -= 22;
    commands.push(
      "0.99 0.96 0.92 rg",
      `40 ${currentY} 515 22 re f`,
      "0.9 0.6 0.2 RG",
      `40 ${currentY} 515 22 re s`,
      "0.7 0.35 0.0 rg",
      `BT /F2 8 Tf 50 ${currentY + 7} Td (REMAINING DUE BALANCE (PAY LATER)) Tj ET`,
      `BT /F2 10 Tf 435 ${currentY + 6} Td (INR ${payLaterNum.toLocaleString("en-IN")}.00) Tj ET`
    );
  }

  // Footer & Signatures
  commands.push(
    "0.8 0.83 0.88 RG 1 w",
    "40 100 515 1 re s",
    "0.4 0.45 0.5 rg",
    "BT /F2 8 Tf 40 85 Td (Spiritual Homeopathy Administration - Official Payment Receipt) Tj ET",
    "BT /F1 7 Tf 40 73 Td (This is a computer-generated tax invoice & receipt. No physical signature required.) Tj ET",

    "380 100 160 1 re s",
    "0.1 0.15 0.2 rg",
    "BT /F2 9 Tf 410 85 Td (Accounts Department) Tj ET",
    "0.4 0.45 0.5 rg",
    `BT /F1 8 Tf 405 73 Td (${escapePdfText(branchName)}) Tj ET`,
    "Q"
  );

  const contentStream = commands.join("\n");
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(contentStream);
  const streamLen = streamBytes.length;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];

  function addObj(str: string) {
    offsets.push(encoder.encode(out).length);
    out += str + "\n";
  }

  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  addObj(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj"
  );
  addObj(`4 0 obj\n<< /Length ${streamLen} >>\nstream\n${contentStream}\nendstream\nendobj`);
  addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  addObj("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");

  const startXref = encoder.encode(out).length;
  out += "xref\n0 7\n0000000000 65535 f \n";
  for (let i = 0; i < offsets.length; i++) {
    out += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  out += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return new Blob([out], { type: "application/pdf" });
}

/**
 * Downloads the official payment receipt invoice PDF directly to the device.
 */
export function downloadInvoicePDF(inv: InvoiceReceiptPDFData) {
  const blob = buildInvoicePDFBlob(inv);
  const filename = `Payment_Receipt_${inv.invoiceId || Date.now().toString().slice(-6)}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Shares the actual PDF document attachment with NO text message.
 * Falls back to automatic download and opening direct chat if native sharing is unavailable.
 */
export async function shareInvoicePDF(
  inv: InvoiceReceiptPDFData
): Promise<{ success: boolean; sharedVia: "web-share" | "download" }> {
  const blob = buildInvoicePDFBlob(inv);
  const filename = `Payment_Receipt_${inv.invoiceId || Date.now().toString().slice(-6)}.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });

  // 1. If Web Share API supports file attachments (Mobile & supported Desktop)
  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        // STRICTLY NO TEXT per user instruction: "pdf attachment only no text"
      });
      return { success: true, sharedVia: "web-share" };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { success: false, sharedVia: "web-share" };
      }
      console.warn("navigator.share failed, falling back to download:", err);
    }
  }

  // 2. Fallback: Automatically download the PDF file and open direct chat (without pre-filled text)
  downloadInvoicePDF(inv);

  const cleanPhone = String(inv.phone || "").replace(/\D/g, "").slice(-10);
  if (cleanPhone.length >= 10) {
    // Open clean WhatsApp chat with NO text param so user can attach or drag-drop the PDF
    window.open(`https://wa.me/91${cleanPhone}`, "_blank");
  }

  return { success: true, sharedVia: "download" };
}
