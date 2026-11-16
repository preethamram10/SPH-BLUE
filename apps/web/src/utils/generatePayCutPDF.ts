import { CLINIC_LOGO_BASE64 } from "@/app/reception/medical-requests/pdf/logoBase64";
import { getBranchPhone } from "@/app/reception/medical-requests/pdf/generateMedicineRequestPDF";

export interface PayCutSlipData {
  id: string;
  employeeId?: string;
  employeeName: string;
  branch: string;
  amount: number | string;
  reason: string;
  month: string;
  date: string;
  image?: string;
  issuedBy?: string;
}

export interface PayCutEmployeeData {
  id?: string;
  name?: string;
  branchName?: string;
  phone?: string;
  phoneNumber?: string;
  salary?: number | string;
  baseSalary?: number | string;
  category?: string;
}

/**
 * Escapes characters for PDF literal strings.
 */
function escapePdfText(text: string): string {
  return String(text || "")
    .split("\\")
    .join("\\\\")
    .split("(")
    .join("\\(")
    .split(")")
    .join("\\)");
}

/**
 * Generates an ISO-32000 compliant binary PDF document as an ArrayBuffer/Blob.
 * Creates an official A4 salary deduction memo with logo header, financial tables,
 * incident description, and signature sign-off.
 */
export function buildPayCutPDFBlob(cut: PayCutSlipData, emp?: PayCutEmployeeData | null): Blob {
  const baseSalary = Number(emp?.salary || emp?.baseSalary || 25000);
  const deductionAmount = Number(cut?.amount || 0);
  const netSalary = Math.max(0, baseSalary - deductionAmount);
  const phone = emp?.phone || emp?.phoneNumber || "On File";

  const commands: string[] = [
    "q",
    // Top header border rose
    "0.88 0.12 0.24 rg",
    "40 790 515 4 re f",

    // Header Title
    "0.06 0.09 0.16 rg",
    `BT /F2 16 Tf 40 805 Td (${escapePdfText("SPIRITUAL HOMEOPATHY CLINICS")}) Tj ET`,
    "0.4 0.45 0.5 rg",
    `BT /F1 9 Tf 40 775 Td (${escapePdfText("Center of Excellence in Classical Homeopathy")}) Tj ET`,

    // Right side header
    "0.88 0.12 0.24 rg",
    `BT /F2 11 Tf 360 805 Td (${escapePdfText((cut.branch || "Main Branch").toUpperCase())}) Tj ET`,
    "0.3 0.35 0.4 rg",
    `BT /F1 8 Tf 360 792 Td (Tel: ${escapePdfText(getBranchPhone(cut.branch))}) Tj ET`,
    "BT /F1 8 Tf 360 780 Td (Email: hr@spiritualhomeo.com) Tj ET",

    // Notice Title Banner
    "0.96 0.97 0.98 rg",
    "40 735 515 28 re f",
    "0.8 0.83 0.88 RG 1 w",
    "40 735 515 28 re s",

    "0.06 0.09 0.16 rg",
    `BT /F2 12 Tf 110 745 Td (${escapePdfText("OFFICIAL SALARY DEDUCTION & DISCIPLINARY MEMO")}) Tj ET`,

    // Employee & Memo Information Box
    "0.98 0.98 0.99 rg",
    "40 645 515 80 re f",
    "0.85 0.88 0.92 RG 1 w",
    "40 645 515 80 re s",

    "0.4 0.45 0.5 rg",
    "BT /F2 8 Tf 50 710 Td (EMPLOYEE NAME:) Tj ET",
    "BT /F2 8 Tf 310 710 Td (MEMO REF NO:) Tj ET",
    "BT /F2 8 Tf 50 685 Td (BRANCH LOCATION:) Tj ET",
    "BT /F2 8 Tf 310 685 Td (APPLICABLE MONTH:) Tj ET",
    "BT /F2 8 Tf 50 660 Td (MOBILE NUMBER:) Tj ET",
    "BT /F2 8 Tf 310 660 Td (INCIDENT / DEDUCTION DATE:) Tj ET",

    "0.06 0.09 0.16 rg",
    `BT /F2 11 Tf 145 710 Td (${escapePdfText(cut.employeeName)}) Tj ET`,
    `BT /F2 10 Tf 410 710 Td (${escapePdfText(cut.id)}) Tj ET`,
    `BT /F1 9 Tf 145 685 Td (${escapePdfText(cut.branch)}) Tj ET`,
    "0.88 0.12 0.24 rg",
    `BT /F2 10 Tf 410 685 Td (${escapePdfText(cut.month)}) Tj ET`,
    "0.06 0.09 0.16 rg",
    `BT /F1 9 Tf 145 660 Td (${escapePdfText(phone)}) Tj ET`,
    `BT /F1 9 Tf 450 660 Td (${escapePdfText(cut.date)}) Tj ET`,

    // Financial Table Header
    "0.93 0.95 0.97 rg",
    "40 610 515 22 re f",
    "0.8 0.83 0.88 RG",
    "40 610 515 22 re s",

    "0.2 0.25 0.3 rg",
    "BT /F2 9 Tf 50 617 Td (SALARY COMPONENT / DESCRIPTION) Tj ET",
    "BT /F2 9 Tf 330 617 Td (TYPE) Tj ET",
    "BT /F2 9 Tf 470 617 Td (AMOUNT) Tj ET",

    // Row 1: Gross Base Salary
    "1 1 1 rg",
    "40 580 515 30 re f",
    "0.9 0.92 0.94 RG",
    "40 580 515 30 re s",

    "0.06 0.09 0.16 rg",
    "BT /F2 10 Tf 50 595 Td (Monthly Gross Base Salary) Tj ET",
    "0.4 0.45 0.5 rg",
    `BT /F1 8 Tf 50 585 Td (Applicable for ${escapePdfText(cut.month)}) Tj ET`,
    "BT /F1 9 Tf 330 592 Td (Credit) Tj ET",
    "0.06 0.09 0.16 rg",
    `BT /F2 10 Tf 460 592 Td (INR ${baseSalary.toLocaleString("en-IN")}.00) Tj ET`,

    // Row 2: Disciplinary Pay Cut
    "1.0 0.95 0.95 rg",
    "40 550 515 30 re f",
    "0.98 0.8 0.8 RG",
    "40 550 515 30 re s",

    "0.7 0.1 0.1 rg",
    "BT /F2 10 Tf 50 565 Td (Disciplinary Penalty / Pay Cut) Tj ET",
    "0.6 0.2 0.2 rg",
    `BT /F1 8 Tf 50 555 Td (Ref: ${escapePdfText(cut.id)}) Tj ET`,
    "BT /F2 9 Tf 330 562 Td (Deduction) Tj ET",
    "0.85 0.1 0.2 rg",
    `BT /F2 11 Tf 455 562 Td (- INR ${deductionAmount.toLocaleString("en-IN")}.00) Tj ET`,

    // Row 3: Net Adjusted Payout
    "0.06 0.09 0.16 rg",
    "40 520 515 30 re f",
    "1 1 1 rg",
    `BT /F2 10 Tf 50 532 Td (NET ADJUSTED PAYOUT FOR ${escapePdfText(cut.month.toUpperCase())}) Tj ET`,
    "0.15 0.85 0.45 rg",
    `BT /F2 12 Tf 450 532 Td (INR ${netSalary.toLocaleString("en-IN")}.00) Tj ET`,

    // Reason & Findings Box
    "0.99 0.97 0.92 rg",
    "40 435 515 70 re f",
    "0.95 0.85 0.65 RG 1 w",
    "40 435 515 70 re s",

    "0.7 0.4 0.0 rg",
    "BT /F2 9 Tf 50 490 Td (REASON FOR SALARY DEDUCTION & HR FINDINGS:) Tj ET",
    "0.1 0.15 0.2 rg",
    `BT /F1 9 Tf 50 472 Td (${escapePdfText(cut.reason.slice(0, 95))}) Tj ET`,
  ];

  if (cut.reason.length > 95) {
    commands.push(`BT /F1 9 Tf 50 458 Td (${escapePdfText(cut.reason.slice(95, 190))}) Tj ET`);
  }
  commands.push(
    "0.4 0.45 0.5 rg",
    `BT /F2 8 Tf 50 442 Td (Approved & Logged by: ${escapePdfText(cut.issuedBy || "Admin / HR")}) Tj ET`
  );

  // Attached proof note (AWS S3)
  if (cut.image) {
    commands.push(
      "0.95 0.96 0.98 rg",
      "40 380 515 45 re f",
      "0.85 0.88 0.92 RG 1 w",
      "40 380 515 45 re s",
      "0.2 0.4 0.7 rg",
      "BT /F2 8 Tf 50 408 Td (ATTACHED INCIDENT PROOF / EVIDENCE (AWS S3):) Tj ET",
      "0.1 0.2 0.3 rg",
      `BT /F1 8 Tf 50 392 Td (${escapePdfText(cut.image.slice(0, 95))}) Tj ET`
    );
  }

  // Footer & Signatures
  commands.push(
    "0.8 0.83 0.88 RG 1 w",
    "40 120 515 1 re s",

    "0.4 0.45 0.5 rg",
    "BT /F2 8 Tf 40 105 Td (Spiritual Homeopathy Administration) Tj ET",
    "BT /F1 7 Tf 40 93 Td (Computer-generated official disciplinary memo. Retain for personal accounting.) Tj ET",

    "380 120 160 1 re s",
    "0.1 0.15 0.2 rg",
    "BT /F2 9 Tf 410 105 Td (Authorized Signatory) Tj ET",
    "0.4 0.45 0.5 rg",
    "BT /F1 8 Tf 405 93 Td (HR & Finance Department) Tj ET",
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
 * Downloads the official salary deduction memo PDF directly to the device.
 */
export function downloadPayCutPDF(cut: PayCutSlipData, emp?: PayCutEmployeeData | null) {
  const blob = buildPayCutPDFBlob(cut, emp);
  const filename = `Salary_Deduction_Memo_${cut.id}.pdf`;
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
 * Native PDF Sharing:
 * Shares the actual PDF document attachment with NO text message.
 * Falls back to automatic download if native file sharing is unavailable.
 */
export async function sharePayCutPDF(
  cut: PayCutSlipData,
  emp?: PayCutEmployeeData | null
): Promise<{ success: boolean; sharedVia: "web-share" | "download" }> {
  const blob = buildPayCutPDFBlob(cut, emp);
  const filename = `Salary_Deduction_Memo_${cut.id}.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });

  // 1. If Web Share API supports file attachments (Mobile & supported Desktop)
  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        // STRICTLY NO TEXT per user instructions: "pdf attachment only no text"
      });
      return { success: true, sharedVia: "web-share" };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { success: false, sharedVia: "web-share" };
      }
      console.warn("navigator.share failed, falling back to direct download:", err);
    }
  }

  // 2. Fallback: Automatically download the PDF file and open direct chat (without pre-filled text)
  downloadPayCutPDF(cut, emp);

  const cleanPhone = String(emp?.phone || emp?.phoneNumber || "").replace(/\D/g, "");
  if (cleanPhone.length >= 10) {
    // Open clean WhatsApp chat with NO text param so user can attach or drag-drop the PDF
    window.open(`https://wa.me/91${cleanPhone.slice(-10)}`, "_blank");
  }

  return { success: true, sharedVia: "download" };
}

/**
 * Opens a dedicated printable A4 invoice sheet window matching clinic branding.
 */
export function printPayCutSlip(cut: PayCutSlipData, emp?: PayCutEmployeeData | null) {
  const baseSalary = Number(emp?.salary || emp?.baseSalary || 25000);
  const deductionAmount = Number(cut?.amount || 0);
  const netSalary = Math.max(0, baseSalary - deductionAmount);
  const phone = emp?.phone || emp?.phoneNumber || "On Record";
  const branchPhone = getBranchPhone(cut.branch);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups to view/print the deduction memo.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Salary Deduction Memo - ${cut.id}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 16px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #e11d48;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .logo-container img { height: 46px; width: auto; object-fit: contain; }
    .clinic-title { font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 4px; }
    .clinic-sub { font-size: 10px; color: #64748b; font-weight: 600; }
    .clinic-info { text-align: right; font-size: 10.5px; color: #475569; }
    .branch-tag { font-size: 12px; font-weight: 900; color: #e11d48; text-transform: uppercase; margin-bottom: 2px; }
    .title-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-align: center;
      padding: 8px 12px;
      margin-bottom: 14px;
    }
    .title-banner h2 { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
    .title-banner .meta { font-size: 10.5px; color: #64748b; margin-top: 2px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .info-label { font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 800; display: block; }
    .info-val { font-size: 12px; font-weight: 800; color: #0f172a; }
    .info-val-rose { font-size: 12px; font-weight: 900; color: #e11d48; }
    .salary-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 14px;
      font-size: 11.5px;
    }
    .salary-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 10px;
      padding: 8px 12px;
      border-bottom: 1px solid #cbd5e1;
    }
    .salary-table td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
    .salary-table tr.deduction-row { background: #fff1f2; }
    .salary-table tr.total-row { background: #0f172a; color: #ffffff; font-weight: 900; }
    .salary-table tr.total-row td { border-bottom: none; }
    .reason-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
      font-size: 11.5px;
    }
    .reason-title { font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #854d0e; margin-bottom: 4px; }
    .proof-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 10.5px;
    }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 14px;
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #64748b;
    }
    .sign-box { text-align: center; min-width: 150px; }
    .sign-line { border-bottom: 1px solid #94a3b8; margin-bottom: 4px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <img src="${CLINIC_LOGO_BASE64}" alt="Logo" />
      <div class="clinic-title">Spiritual Homeopathy Clinics</div>
      <div class="clinic-sub">Center of Excellence in Classical Homeopathy</div>
    </div>
    <div class="clinic-info">
      <div class="branch-tag">${cut.branch}</div>
      <div>Tel: ${branchPhone}</div>
      <div>Email: hr@spiritualhomeo.com</div>
      <div>Official Administrative Memo</div>
    </div>
  </div>

  <div class="title-banner">
    <h2>Official Salary Deduction &amp; Disciplinary Memo</h2>
    <div class="meta">
      Reference ID: <strong>${cut.id}</strong> &bull; Incident Date: <strong>${cut.date}</strong> &bull; Applicable Month: <strong>${cut.month}</strong>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <span class="info-label">Employee Name</span>
      <span class="info-val">${cut.employeeName}</span>
    </div>
    <div>
      <span class="info-label">Employee ID / Category</span>
      <span class="info-val">${emp?.id || cut.employeeId || "Staff Member"} (${emp?.category || "Staff"})</span>
    </div>
    <div>
      <span class="info-label">Branch Location</span>
      <span class="info-val">${cut.branch}</span>
    </div>
    <div>
      <span class="info-label">Contact Mobile</span>
      <span class="info-val">${phone}</span>
    </div>
    <div>
      <span class="info-label">Applicable Salary Month</span>
      <span class="info-val-rose">${cut.month}</span>
    </div>
    <div>
      <span class="info-label">Authorized / Issued By</span>
      <span class="info-val">${cut.issuedBy || "Admin / HR"}</span>
    </div>
  </div>

  <table class="salary-table">
    <thead>
      <tr>
        <th style="text-align: left;">Salary Component / Description</th>
        <th style="text-align: center; width: 20%;">Type</th>
        <th style="text-align: right; width: 25%;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>Monthly Gross Base Salary</strong>
          <div style="font-size: 10px; color: #64748b;">Scheduled for ${cut.month}</div>
        </td>
        <td style="text-align: center; color: #475569; font-weight: 600;">Credit</td>
        <td style="text-align: right; font-weight: 800;">₹${baseSalary.toLocaleString("en-IN")}.00</td>
      </tr>
      <tr class="deduction-row">
        <td>
          <strong style="color: #be123c;">Disciplinary Penalty / Pay Cut</strong>
          <div style="font-size: 10px; color: #9f1239;">Ref: ${cut.id}</div>
        </td>
        <td style="text-align: center; color: #be123c; font-weight: 800;">Deduction</td>
        <td style="text-align: right; font-weight: 900; color: #e11d48; font-size: 13px;">
          - ₹${deductionAmount.toLocaleString("en-IN")}.00
        </td>
      </tr>
      <tr class="total-row">
        <td colspan="2">NET ADJUSTED PAYOUT FOR ${cut.month.toUpperCase()}</td>
        <td style="text-align: right; color: #4ade80; font-size: 14px;">₹${netSalary.toLocaleString("en-IN")}.00</td>
      </tr>
    </tbody>
  </table>

  <div class="reason-box">
    <div class="reason-title">&#9888; Reason for Disciplinary Pay Cut &amp; Findings:</div>
    <div style="color: #1e293b; font-weight: 500;">${cut.reason}</div>
  </div>

  ${cut.image ? `
  <div class="proof-box">
    <div style="font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 4px;">Attached Proof / Evidence (AWS S3):</div>
    ${cut.image.match(/\.(jpeg|jpg|png|gif|webp)($|\?)/i) || cut.image.startsWith("data:image") ? `
      <div style="text-align: center; margin-top: 6px;">
        <img src="${cut.image}" alt="Proof" style="max-height: 140px; border-radius: 6px; border: 1px solid #cbd5e1;" />
      </div>
    ` : `
      <div style="color: #0284c7;">Document Attachment: ${cut.image}</div>
    `}
  </div>
  ` : ""}

  <div class="footer">
    <div>
      <p style="font-weight: 800; color: #334155;">Spiritual Homeopathy Administration</p>
      <p style="font-style: italic;">Computer-generated official disciplinary memo. Retain for tax &amp; accounting records.</p>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <p style="font-weight: 800; color: #0f172a;">Authorized Signatory</p>
      <p style="font-size: 9px; color: #64748b;">HR &amp; Finance Department</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
