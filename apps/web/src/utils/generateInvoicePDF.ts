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

// Pre-encoded 243x67 RGB FlateDecode stream of /assets/SH logo.png composited onto white
const SH_LOGO_WIDTH = 243;
const SH_LOGO_HEIGHT = 67;
const SH_LOGO_FLATE_B64 =
  "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";

function base64ToUint8Array(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function escapePdfText(text: string): string {
  return String(text || "")
    .replace(/[^\x20-\x7E]/g, " ")
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

function formatMoney(val: number | string | undefined): string {
  const n = Number(val || 0);
  return `Rs. ${n.toFixed(2)}`;
}

function estimateTextWidth(text: string, fontSize: number, bold = false): number {
  const factor = bold ? 0.56 : 0.52;
  return text.length * fontSize * factor;
}

function rightAlignedText(
  text: string,
  rightX: number,
  y: number,
  fontKey: "F1" | "F2" | "F3",
  fontSize: number
): string {
  const w = estimateTextWidth(text, fontSize, fontKey === "F2");
  const x = Math.max(42, rightX - w);
  return `BT /${fontKey} ${fontSize} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapePdfText(text)}) Tj ET`;
}

/**
 * Builds an official ISO-32000 compliant A4 PDF document for Payment Receipt & Tax Invoice
 * matching the official Print Receipt layout in FeeCheckoutAndInvoiceModal.
 */
export function buildInvoicePDFBlob(inv: InvoiceReceiptPDFData): Blob {
  const invoiceNum = inv.invoiceId || "INV-RECEIPT";
  const cleanPhone = String(inv.phone || "").replace(/\D/g, "").slice(-10) || "On Record";
  const branchName = inv.branch || "KPHB Branch";
  const branchPhone = getBranchPhone(branchName);
  const doctorName = inv.doctorName || "Dr. Prashant K Vaidya";
  const dateStr = inv.appointmentDate || new Date().toISOString().slice(0, 10);
  const timeStr = inv.timeSlot ? ` at ${inv.timeSlot}` : "";
  const paymentModeStr = formatPaymentMode(inv.paymentMode || inv.paymentMethod || "UPI");

  const totalPaidNum = Number(inv.totalPaid ?? inv.totalAmountDue ?? 0);
  const payLaterNum = Number(inv.payLaterAmount || 0);
  const isPartial = payLaterNum > 0;
  const totalBillNum = Number(inv.totalAmountDue || totalPaidNum + payLaterNum);

  const issuedAtStr = inv.paidAt
    ? new Date(inv.paidAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const commands: string[] = [
    "q",
    // Outer subtle card border
    "1 1 1 rg",
    "24 24 547 794 re f",
    "0.886 0.910 0.941 RG 0.8 w",
    "24 24 547 794 re s",

    // 1. TOP HEADER: Clinic Logo Left, Contact Info Right
    "q",
    `124 0 0 34.2 42 764 cm`,
    "/Im1 Do",
    "Q",

    "0.278 0.333 0.412 rg", // slate-600
    rightAlignedText("spiritualhomeoclinic.com", 553, 788, "F2", 9.5),
    "0.392 0.455 0.545 rg", // slate-500
    rightAlignedText("support@spiritualhomeo.com", 553, 774, "F1", 8.5),

    // 2. BRIGHT GREEN HORIZONTAL ACCENT BAR (#84cc16)
    "0.518 0.800 0.086 rg",
    "42 748 511 3.5 re f",

    // 3. TITLE & RECEIPT BADGE
    "0.059 0.090 0.165 rg", // slate-900
    `BT /F2 14 Tf 42 722 Td (${escapePdfText("PAYMENT RECEIPT")}) Tj ET`,

    // Sky-blue RECEIPT pill badge
    "0.941 0.976 1.000 rg",
    "492 718 61 17 re f",
    "0.878 0.949 0.996 RG 0.8 w",
    "492 718 61 17 re s",
    "0.008 0.518 0.780 rg", // sky-600
    `BT /F2 8 Tf 504.5 723.5 Td (${escapePdfText("RECEIPT")}) Tj ET`,

    // 4. PATIENT DETAILS SECTION
    "0.580 0.639 0.722 rg", // slate-400
    "BT /F2 7.5 Tf 42 694 Td (PATIENT DETAILS) Tj ET",

    // Left column (x=42..282)
    "0.580 0.639 0.722 rg",
    "BT /F2 7 Tf 42 678 Td (PATIENT NAME) Tj ET",
    "0.059 0.090 0.165 rg",
    `BT /F2 10 Tf 42 664 Td (${escapePdfText(inv.patientName || "Patient")}) Tj ET`,
    "0.945 0.961 0.976 RG 0.6 w",
    "42 657 m 282 657 l S",

    "0.580 0.639 0.722 rg",
    "BT /F2 7 Tf 42 644 Td (CONSULTANT DOCTOR) Tj ET",
    "0.059 0.090 0.165 rg",
    `BT /F2 9 Tf 42 631 Td (${escapePdfText(doctorName)}) Tj ET`,
    "0.945 0.961 0.976 RG 0.6 w",
    "42 624 m 282 624 l S",

    "0.580 0.639 0.722 rg",
    "BT /F2 7 Tf 42 611 Td (APPOINTMENT SCHEDULE) Tj ET",
    "0.059 0.090 0.165 rg",
    `BT /F2 9 Tf 42 598 Td (${escapePdfText(dateStr + timeStr)}) Tj ET`,

    // Right column (x=313..553)
    "0.580 0.639 0.722 rg",
    "BT /F2 7 Tf 313 678 Td (PHONE NUMBER) Tj ET",
    "0.059 0.090 0.165 rg",
    `BT /F2 9.5 Tf 313 664 Td (+91 ${escapePdfText(cleanPhone)}) Tj ET`,
    "0.945 0.961 0.976 RG 0.6 w",
    "313 657 m 553 657 l S",

    "0.580 0.639 0.722 rg",
    "BT /F2 7 Tf 313 644 Td (CLINIC BRANCH) Tj ET",
    "0.059 0.090 0.165 rg",
    `BT /F2 9 Tf 313 631 Td (${escapePdfText(branchName)}) Tj ET`,
    "0.945 0.961 0.976 RG 0.6 w",
    "313 624 m 553 624 l S",

    "0.580 0.639 0.722 rg",
    "BT /F2 7 Tf 313 611 Td (SPECIALTY) Tj ET",
    "0.059 0.090 0.165 rg",
    "BT /F2 9 Tf 313 598 Td (Homeopathy) Tj ET",

    // 5. PAYMENT INFORMATION BOX (Dashed Border)
    "0.580 0.639 0.722 rg",
    "BT /F2 7.5 Tf 42 574 Td (PAYMENT INFORMATION) Tj ET",
  ];

  if (isPartial) {
    commands.push(
      "q",
      "1.000 0.984 0.922 rg", // amber-50
      "42 508 511 58 re f",
      "0.988 0.827 0.302 RG 1.4 w [4 3] 0 d", // dashed amber-300
      "42 508 511 58 re s",
      "Q",

      "0.471 0.208 0.059 rg", // amber-900
      "BT /F2 7.5 Tf 56 550 Td (AMOUNT PAID TODAY) Tj ET",
      "0.020 0.588 0.412 rg", // emerald-600
      `BT /F2 19 Tf 56 528 Td (${escapePdfText(formatMoney(totalPaidNum))}) Tj ET`,
      "0.573 0.251 0.055 rg",
      `BT /F2 8 Tf 56 515 Td (Remaining Due \\(Pay Later\\): ${escapePdfText(formatMoney(payLaterNum))}) Tj ET`,

      // PARTIAL PAID pill badge
      "0.961 0.620 0.043 rg",
      "458 538 82 18 re f",
      "1 1 1 rg",
      "BT /F2 8 Tf 469 544 Td (PARTIAL PAID) Tj ET",
      "0.471 0.208 0.059 rg",
      rightAlignedText(`VIA ${paymentModeStr}`, 540, 523, "F2", 7.5)
    );
  } else {
    commands.push(
      "q",
      "0.941 0.992 0.957 rg", // #f0fdf4
      "42 510 511 56 re f",
      "0.525 0.937 0.675 RG 1.4 w [4 3] 0 d", // dashed #86efac
      "42 510 511 56 re s",
      "Q",

      "0.024 0.373 0.275 rg", // emerald-800
      "BT /F2 7.5 Tf 56 549 Td (TOTAL AMOUNT PAID) Tj ET",
      "0.020 0.588 0.412 rg", // emerald-600
      `BT /F2 20 Tf 56 525 Td (${escapePdfText(formatMoney(totalPaidNum))}) Tj ET`,

      // PAID pill badge (#22c55e)
      "0.133 0.773 0.369 rg",
      "486 538 54 18 re f",
      "1 1 1 rg",
      "BT /F2 8.5 Tf 502.5 544 Td (PAID) Tj ET",
      "0.024 0.373 0.275 rg",
      rightAlignedText(`VIA ${paymentModeStr}`, 540, 523, "F2", 7.5)
    );
  }

  // 6. FEE BREAKDOWN TABLE
  let currentY = 472;
  commands.push(
    "0.580 0.639 0.722 rg",
    "BT /F2 7.5 Tf 42 486 Td (FEE BREAKDOWN) Tj ET",
    "0.886 0.910 0.941 RG 0.8 w",
    `42 ${currentY + 10} m 553 ${currentY + 10} l S`,
    `42 ${currentY - 8} m 553 ${currentY - 8} l S`,
    "0.580 0.639 0.722 rg",
    `BT /F2 7.5 Tf 42 ${currentY - 2} Td (DESCRIPTION) Tj ET`,
    rightAlignedText("AMOUNT (Rs.)", 553, currentY - 2, "F2", 7.5)
  );
  currentY -= 8;

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
          sub: `${m.type || "Pills"}${m.timing ? ` - ${m.timing}` : ""}`,
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

  items.forEach((item) => {
    const rowH = item.sub ? 28 : 22;
    currentY -= rowH;
    commands.push(
      "0.059 0.090 0.165 rg",
      `BT /F2 9 Tf 42 ${currentY + (item.sub ? 14 : 7)} Td (${escapePdfText(item.desc)}) Tj ET`
    );
    if (item.sub) {
      commands.push(
        "0.392 0.455 0.545 rg",
        `BT /F1 7.5 Tf 42 ${currentY + 4} Td (${escapePdfText(item.sub)}) Tj ET`
      );
    }
    commands.push(
      "0.059 0.090 0.165 rg",
      rightAlignedText(formatMoney(item.amt), 553, currentY + (item.sub ? 11 : 7), "F2", 9),
      "0.945 0.961 0.976 RG 0.6 w",
      `42 ${currentY} m 553 ${currentY} l S`
    );
  });

  if (Number(inv.discount) > 0) {
    currentY -= 22;
    commands.push(
      "0.863 0.149 0.149 rg",
      `BT /F2 8.5 Tf 42 ${currentY + 7} Td (${escapePdfText(`Discount (${inv.discountReason || "Special Waiver"})`)}) Tj ET`,
      rightAlignedText(`- ${formatMoney(inv.discount)}`, 553, currentY + 7, "F2", 8.5),
      "0.945 0.961 0.976 RG 0.6 w",
      `42 ${currentY} m 553 ${currentY} l S`
    );
  }

  // Total Row(s)
  if (isPartial) {
    currentY -= 22;
    commands.push(
      "0.886 0.910 0.941 RG 0.8 w",
      `42 ${currentY + 22} m 553 ${currentY + 22} l S`,
      "0.392 0.455 0.545 rg",
      `BT /F2 8 Tf 42 ${currentY + 7} Td (TOTAL BILL AMOUNT) Tj ET`,
      "0.118 0.161 0.231 rg",
      rightAlignedText(formatMoney(totalBillNum), 553, currentY + 7, "F2", 9)
    );

    currentY -= 22;
    commands.push(
      "0.016 0.471 0.341 rg",
      `BT /F2 8.5 Tf 42 ${currentY + 7} Td (AMOUNT PAID TODAY (${escapePdfText(paymentModeStr)})) Tj ET`,
      "0.020 0.588 0.412 rg",
      rightAlignedText(formatMoney(totalPaidNum), 553, currentY + 7, "F2", 10)
    );

    currentY -= 24;
    commands.push(
      "1.000 0.984 0.922 rg",
      `42 ${currentY} 511 24 re f`,
      "0.961 0.620 0.043 RG 1.2 w",
      `42 ${currentY + 24} m 553 ${currentY + 24} l S`,
      "0.471 0.208 0.059 rg",
      `BT /F2 8.5 Tf 48 ${currentY + 8} Td (REMAINING NEED TO PAY (PAY LATER)) Tj ET`,
      rightAlignedText(formatMoney(payLaterNum), 547, currentY + 8, "F2", 10)
    );
  } else {
    currentY -= 26;
    commands.push(
      "0.059 0.090 0.165 RG 1.4 w",
      `42 ${currentY + 26} m 553 ${currentY + 26} l S`,
      "0.059 0.090 0.165 rg",
      `BT /F2 9 Tf 42 ${currentY + 8} Td (TOTAL PAID (${escapePdfText(paymentModeStr)})) Tj ET`,
      rightAlignedText(formatMoney(totalPaidNum), 553, currentY + 8, "F2", 10.5),
      "0.886 0.910 0.941 RG 0.8 w",
      `42 ${currentY} m 553 ${currentY} l S`
    );
  }

  // 7. RECEIPT METADATA & DISCLAIMER
  const metaY = Math.max(96, currentY - 22);
  commands.push(
    "0.580 0.639 0.722 rg",
    `BT /F1 8 Tf 42 ${metaY} Td (Payment ID: ${escapePdfText(invoiceNum)}) Tj ET`,
    `BT /F1 8 Tf 42 ${metaY - 13} Td (Issued At: ${escapePdfText(issuedAtStr)}) Tj ET`,
    `BT /F3 8 Tf 185 ${metaY - 32} Td (This is a computer generated bill. No signature is required.) Tj ET`
  );

  // 8. BOTTOM GREEN FOOTER BAR (#84cc16)
  commands.push(
    "0.518 0.800 0.086 rg",
    "42 38 511 26 re f",
    "1 1 1 rg",
    `BT /F2 8 Tf 52 48 Td (${escapePdfText(branchPhone)}) Tj ET`,
    "BT /F2 8 Tf 175 48 Td (support@spiritualhomeo.com) Tj ET",
    "BT /F2 8 Tf 325 48 Td (spiritualhomeoclinic.com) Tj ET",
    rightAlignedText(branchName.toUpperCase(), 543, 48, "F2", 8),
    "Q"
  );

  const contentStream = commands.join("\n");
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(contentStream);
  const logoBytes = base64ToUint8Array(SH_LOGO_FLATE_B64);

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let totalLen = 0;

  function pushBytes(b: Uint8Array) {
    chunks.push(b);
    totalLen += b.length;
  }

  function pushStr(s: string) {
    pushBytes(encoder.encode(s));
  }

  function startObj() {
    offsets.push(totalLen);
  }

  pushStr("%PDF-1.4\n");

  startObj();
  pushStr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObj();
  pushStr("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  startObj();
  pushStr(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> /XObject << /Im1 8 0 R >> >> >>\nendobj\n"
  );

  startObj();
  pushStr(`4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
  pushBytes(streamBytes);
  pushStr("\nendstream\nendobj\n");

  startObj();
  pushStr("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  startObj();
  pushStr("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");

  startObj();
  pushStr("7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj\n");

  startObj();
  pushStr(
    `8 0 obj\n<< /Type /XObject /Subtype /Image /Width ${SH_LOGO_WIDTH} /Height ${SH_LOGO_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${logoBytes.length} >>\nstream\n`
  );
  pushBytes(logoBytes);
  pushStr("\nendstream\nendobj\n");

  const startXref = totalLen;
  pushStr(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  for (let i = 0; i < offsets.length; i++) {
    pushStr(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  }
  pushStr(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`);

  const blobParts: BlobPart[] = chunks.map((c) => new Uint8Array(c));
  return new Blob(blobParts, { type: "application/pdf" });
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
