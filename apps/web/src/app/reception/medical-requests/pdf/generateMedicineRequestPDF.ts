import { CLINIC_LOGO_BASE64 } from "./logoBase64";

export interface MedicineItem {
  name: string;
  timing: string; // e.g. "M - A - N", "1-0-1", "SOS"
  type?: string; // "Pills", "Tablet", "Syrup", "Drops", "Mother Tincture"
  amount?: number | string;
}

export interface MedicineRequest {
  id?: string;
  patientName: string;
  phone: string;
  age?: string;
  gender?: string; // "Mr.", "Mrs.", "Ms.", "Master", "Male", "Female"
  branchName: string;
  condition?: string;
  duration?: string; // "1 Month", "2 Months", "3 Months", etc.
  totalAmount?: number;
  medicines: MedicineItem[];
  deliveryAddress?: string;
  notes?: string;
}

// Branch phone directory mapping
export const BRANCH_PHONES: Record<string, string> = {
  kphb: "+91 90301 76176",
  chandanagar: "+91 99031 19766",
  dilshuknagar: "+91 94908 08582",
  nallagandla: "+91 80961 76176",
  banjara: "+91 81252 60176",
};

export const getBranchPhone = (branchName: string = "", branchesList?: any[]): string => {
  const lower = (branchName || "").toLowerCase().trim();

  // 1. Check loaded branches list first if provided
  if (Array.isArray(branchesList) && branchesList.length > 0) {
    const match = branchesList.find((b: any) => {
      const bName = (b.name || "").toLowerCase().trim();
      const bId = (b.id || "").toLowerCase().trim();
      return bName === lower || bName.includes(lower) || lower.includes(bName) || bId === lower;
    });
    if (match && match.phone && String(match.phone).trim()) {
      return String(match.phone).trim();
    }
  }

  // 2. Directory fallback based on known branch names & aliases
  if (lower.includes("chanda") || lower.includes("cngr") || lower.includes("chn")) return BRANCH_PHONES.chandanagar;
  if (lower.includes("dilshuk") || lower.includes("dilsukh") || lower.includes("dsnr") || lower.includes("dil")) return BRANCH_PHONES.dilshuknagar;
  if (lower.includes("nalla") || lower.includes("nlg")) return BRANCH_PHONES.nallagandla;
  if (lower.includes("banjara") || lower.includes("bjh")) return BRANCH_PHONES.banjara;
  if (lower.includes("kphb") || lower.includes("kpb") || lower.includes("kukatpally")) return BRANCH_PHONES.kphb;

  return BRANCH_PHONES.kphb;
};

export const generateMedicineRequestHTML = (req: MedicineRequest): string => {
  // Title & Pronoun resolution
  const resolveTitle = (genderOrTitle?: string) => {
    const g = (genderOrTitle || "").trim().toLowerCase();
    if (g.startsWith("mrs")) return "MRS.";
    if (g.startsWith("ms")) return "MS.";
    if (g.startsWith("master")) return "MASTER";
    if (g.startsWith("dr")) return "DR.";
    if (g.startsWith("female")) return "MS.";
    return "MR.";
  };

  const resolvePronoun = (genderOrTitle?: string) => {
    const g = (genderOrTitle || "").toLowerCase().trim();
    if (g.includes("mrs") || g.includes("ms") || g.includes("female") || g.includes("girl")) {
      return "SHE";
    }
    return "HE";
  };

  const title = resolveTitle(req.gender);
  const pronoun = resolvePronoun(req.gender);
  const patUpper = (req.patientName || "PATIENT").toUpperCase();
  const ageVal = req.age ? req.age.trim() : "";
  const branchDisplay = (req.branchName || "KPHB Branch").toUpperCase();
  const cleanDuration = (req.duration || "1 Month").replace(/months?/gi, "").trim();
  const formattedDate = new Date().toLocaleDateString("en-GB"); // DD/MM/YYYY
  const branchPhone = getBranchPhone(req.branchName);

  const validMedicines = req.medicines && req.medicines.length > 0 ? req.medicines : [];
  const totalAmt = Number(req.totalAmount) || 0;

  // Medicine Rows HTML
  const rowsHtml = validMedicines
    .map(
      (m, idx) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e293b; text-align: center;">
          ${idx + 1}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13.5px;">${m.name || "-"}</div>
          ${m.amount && Number(m.amount) > 0
          ? `<div style="font-size: 11px; color: #166534; font-weight: 700; margin-top: 2px;">Fee: ₹${Number(
            m.amount
          ).toFixed(2)}</div>`
          : ""
        }
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11.5px; display: inline-block; border: 1px solid #bae6fd;">
            ${m.type || "Pills"}
          </span>
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 13px; font-weight: 600;">
          ${m.timing || "-"}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Medicine Certificate - ${patUpper}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        @page {
          size: A4 portrait;
          margin: 0;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Plus Jakarta Sans', Arial, sans-serif;
          background: #ffffff;
          color: #0f172a;
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* TOP HEADER: LEFT WHITE (LOGO), RIGHT BLUE BANNER (INFO) */
        .top-banner {
          background: #ffffff;
          height: 76px;
          width: 100%;
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          padding: 0;
          position: relative;
        }

        .logo-container {
          background: #ffffff;
          flex: 1;
          height: 100%;
          padding: 0 0 0 36px;
          display: flex;
          align-items: center;
          border: none;
          box-shadow: none;
        }

        .top-info-box {
          background: #1d8ecd;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          padding: 0 36px 0 28px;
          gap: 4px;
        }

        .top-web-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ffffff;
          font-weight: 800;
          font-size: 12.5px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .top-reception-phone {
          color: #ffffff;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }

        .globe-circle {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* MAIN CERTIFICATE BODY */
        .cert-content {
          padding: 40px 52px;
          flex: 1;
        }

        .date-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 24px;
          letter-spacing: 0.5px;
        }

        .cert-title {
          text-align: center;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-decoration: underline;
          text-underline-offset: 5px;
          margin: 16px 0 26px 0;
          color: #0f172a;
          text-transform: uppercase;
        }

        .cert-para {
          font-size: 14.5px;
          line-height: 1.9;
          color: #1e293b;
          text-align: justify;
          margin-bottom: 18px;
        }

        .med-heading-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 28px;
          margin-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 6px;
        }

        .med-heading {
          font-weight: 800;
          font-size: 13.5px;
          letter-spacing: 1px;
          color: #1d8ecd;
          text-transform: uppercase;
        }

        table.med-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 4px;
        }

        table.med-table th {
          background: #f8fafc;
          padding: 10px 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1.5px solid #cbd5e1;
        }

        .disclaimer-text {
          margin-top: 48px;
          text-align: center;
          font-size: 11.5px;
          color: #64748b;
          font-style: italic;
          border-top: 1px dashed #cbd5e1;
          padding-top: 14px;
        }

        /* BOTTOM GREEN FOOTER BANNER */
        .bottom-banner {
          background: #a3cf3b;
          height: 48px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 16px;
        }

        .footer-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ffffff;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .footer-v-divider {
          width: 1.5px;
          height: 22px;
          background: rgba(255, 255, 255, 0.8);
        }

        @media print {
          body {
            min-height: 100vh;
          }
          .cert-content {
            padding: 32px 46px;
          }
        }
      </style>
    </head>
    <body>
      <!-- TOP BLUE BANNER WITH LOGO BADGE, BRANCH & RECEPTION PHONE -->
      <div class="top-banner">
        <div class="logo-container">
          <img src="${CLINIC_LOGO_BASE64}" alt="Spiritual Homeopathy Logo" style="height: 52px; width: auto; object-fit: contain;" />
        </div>
        <div class="top-info-box">
          <div class="top-web-link">
            <div class="globe-circle">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="white" stroke-width="2.5" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>
            <span>spiritualhomeoclinic.com</span>
          </div>
          <div class="top-reception-phone">
            📞 Reception: ${branchPhone}
          </div>
        </div>
      </div>

      <!-- CERTIFICATE CONTENT -->
      <div class="cert-content">
        <div class="date-row">
          <span>CLINIC BRANCH: <strong>${branchDisplay}</strong></span>
          <span>DATE: <strong>${formattedDate}</strong></span>
        </div>

        <div class="cert-title">
          TO WHOM SO EVER IT MAY CONCERN
        </div>

        <div class="cert-para">
          THIS IS TO CERTIFY THAT <strong>${title} ${patUpper}</strong>${ageVal ? ` AGED ABOUT <strong>${ageVal} YEARS</strong>,` : ""
    } HAS BEEN UNDER OUR TREATMENT AT SPIRITUAL HOMEOPATHY (${branchDisplay}).
        </div>

        <div class="cert-para">
          ${cleanDuration
      ? `<strong>${pronoun}</strong> NEEDED TO TAKE HOMEOPATHY MEDICINE FOR <strong>${cleanDuration} ${cleanDuration === "1" ? "MONTH" : "MONTHS"
      }</strong>. `
      : ""
    }WE RECOMMENDED THAT <strong>${title} ${patUpper}</strong> CONTINUES TO FOLLOW THE PRESCRIBED MEDICATIONS.
        </div>

        ${
          req.notes && req.notes.trim()
            ? `
          <div style="font-size: 13px; color: #1e293b; line-height: 1.6; margin: 16px 0 14px 0; font-weight: 500; white-space: pre-wrap;">
            ${req.notes.trim()}
          </div>
        `
            : ""
        }

        <!-- MEDICINE TABLE SECTION -->
        <div class="med-heading-bar">
          <div class="med-heading">PRESCRIBED MEDICINES</div>
          ${totalAmt > 0
      ? `
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 4px 12px; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">Total Medicine Fee:</span>
              <span style="font-size: 14px; font-weight: 900; color: #15803d;">₹${totalAmt.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )}</span>
            </div>
          `
      : ""
    }
        </div>

        <table class="med-table">
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">#</th>
              <th style="width: 44%;">Remedy / Medicine Name</th>
              <th style="width: 20%; text-align: center;">Type</th>
              <th style="width: 28%;">Dosage & Timing</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          ${totalAmt > 0
      ? `
            <tfoot>
              <tr style="background-color: #f8fafc; border-top: 2px solid #1d8ecd;">
                <td colspan="3" style="padding: 10px 12px; text-align: right; font-weight: 800; font-size: 12px; color: #0f172a; text-transform: uppercase;">
                  Total Amount:
                </td>
                <td style="padding: 10px 12px; font-weight: 900; font-size: 14px; color: #166534;">
                  ₹${totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          `
      : ""
    }
        </table>

        <div class="disclaimer-text">
          This is a computer-generated document. No physical signature required.
        </div>
      </div>

      <!-- BOTTOM GREEN BANNER WITH BRANCH PHONE & RECEPTION -->
      <div class="bottom-banner">
        <div class="footer-item">
          <span>📞 Reception: ${branchPhone}</span>
        </div>
        <div class="footer-v-divider"></div>
        <div class="footer-item">
          <span>✉️ support@spiritualhomeo.com</span>
        </div>
        <div class="footer-v-divider"></div>
        <div class="footer-item">
          <span>📍 ${branchDisplay}</span>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;
};

export const generateMedicineRequestPDF = (req: MedicineRequest) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups to view/print the certificate.");
    return;
  }

  const htmlContent = generateMedicineRequestHTML(req);
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};