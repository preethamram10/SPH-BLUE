import { Alert, Share } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
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
}

// Branch phone directory mapping
export const BRANCH_PHONES: Record<string, string> = {
  kphb: "+91 90301 76176",
  chandanagar: "+91 95531 76176",
  dilshuknagar: "+91 96761 76176",
  nallagandla: "+91 80961 76176",
};

export const getBranchPhone = (branchName: string = ""): string => {
  const lower = branchName.toLowerCase();
  if (lower.includes("nalla") || lower.includes("nlg")) return BRANCH_PHONES.nallagandla;
  if (lower.includes("chanda") || lower.includes("cngr")) return BRANCH_PHONES.chandanagar;
  if (lower.includes("dilshuk") || lower.includes("dsnr")) return BRANCH_PHONES.dilshuknagar;
  return BRANCH_PHONES.kphb;
};

export const generateMedicineRequestHTML = (req: MedicineRequest): string => {
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
  const formattedDate = new Date().toLocaleDateString("en-GB");
  const branchPhone = getBranchPhone(req.branchName);

  const validMedicines = req.medicines && req.medicines.length > 0 ? req.medicines : [];
  const totalAmt = Number(req.totalAmount) || 0;

  const rowsHtml = validMedicines
    .map(
      (m, idx) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e293b; text-align: center;">
          ${idx + 1}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13.5px;">${m.name || "-"}</div>
          ${
            m.amount && Number(m.amount) > 0
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
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #ffffff; color: #0f172a; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
        .top-banner { background: #1d8ecd; height: 72px; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 24px 0 0; }
        .logo-container { background: #ffffff; height: 80px; padding: 8px 20px; display: flex; align-items: center; gap: 12px; box-shadow: 2px 3px 10px rgba(0,0,0,0.12); border-bottom-right-radius: 8px; }
        .clinic-brand { font-weight: 800; font-size: 16px; color: #0284c7; line-height: 1.1; }
        .clinic-sub { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px; }
        .top-info-box { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .top-web-link { color: #ffffff; font-weight: 800; font-size: 12.5px; text-transform: uppercase; }
        .top-reception-phone { color: #ffffff; font-size: 11.5px; font-weight: 700; letter-spacing: 0.4px; }
        .cert-content { padding: 36px 44px; flex: 1; }
        .date-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 20px; }
        .cert-title { text-align: center; font-size: 16px; font-weight: 800; letter-spacing: 1.5px; text-decoration: underline; margin: 16px 0 24px 0; }
        .cert-para { font-size: 14.5px; line-height: 1.8; color: #1e293b; text-align: justify; margin-bottom: 16px; }
        .med-heading-bar { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
        .med-heading { font-weight: 800; font-size: 13px; letter-spacing: 1px; color: #1d8ecd; text-transform: uppercase; }
        table.med-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        table.med-table th { background: #f8fafc; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #64748b; border-bottom: 1.5px solid #cbd5e1; }
        .disclaimer-text { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; font-style: italic; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
        .bottom-banner { background: #a3cf3b; height: 44px; width: 100%; display: flex; align-items: center; justify-content: space-around; padding: 0 16px; }
        .footer-item { color: #ffffff; font-weight: 800; font-size: 11.5px; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="top-banner">
        <div class="logo-container">
          <img src="${CLINIC_LOGO_BASE64}" alt="Spiritual Homeopathy Logo" style="height: 52px; width: auto; object-fit: contain;" />
          <div>
            <div class="clinic-brand">Spiritual Homeopathy</div>
            <div class="clinic-sub">Holistic Healing Clinics • ${branchDisplay}</div>
          </div>
        </div>
        <div class="top-info-box">
          <div class="top-web-link">spiritualhomeoclinic.com</div>
          <div class="top-reception-phone">📞 Reception: ${branchPhone}</div>
        </div>
      </div>
      <div class="cert-content">
        <div class="date-row">
          <span>CLINIC BRANCH: <strong>${branchDisplay}</strong></span>
          <span>DATE: <strong>${formattedDate}</strong></span>
        </div>
        <div class="cert-title">TO WHOM SO EVER IT MAY CONCERN</div>
        <div class="cert-para">
          THIS IS TO CERTIFY THAT <strong>${title} ${patUpper}</strong>${
            ageVal ? ` AGED ABOUT <strong>${ageVal} YEARS</strong>,` : ""
          } HAS BEEN UNDER OUR TREATMENT AT SPIRITUAL HOMEOPATHY (${branchDisplay}).
        </div>
        <div class="cert-para">
          ${
            cleanDuration
              ? `<strong>${pronoun}</strong> NEEDED TO TAKE HOMEOPATHY MEDICINE FOR <strong>${cleanDuration} ${
                  cleanDuration === "1" ? "MONTH" : "MONTHS"
                }</strong>. `
              : ""
          }WE RECOMMENDED THAT <strong>${title} ${patUpper}</strong> CONTINUES TO FOLLOW THE PRESCRIBED MEDICATIONS.
        </div>
        <div class="med-heading-bar">
          <div class="med-heading">PRESCRIBED MEDICINES</div>
          ${
            totalAmt > 0
              ? `<div style="font-weight: 800; color: #166534; font-size: 13px;">Total Medicine Fee: ₹${totalAmt.toFixed(
                  2
                )}</div>`
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
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="disclaimer-text">
          This is a computer-generated document. No physical signature required.
        </div>
      </div>
      <div class="bottom-banner">
        <div class="footer-item">📞 Reception: ${branchPhone}</div>
        <div class="footer-item">✉️ support@spiritualhomeoclinic.com</div>
        <div class="footer-item">📍 ${branchDisplay}</div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generates an actual PDF file and opens native share dialog to attach/send the PDF!
 * Fully handles FileProvider permissions by copying to FileSystem.cacheDirectory.
 */
export const generateMedicineRequestPDF = async (req: MedicineRequest): Promise<string | null> => {
  const html = generateMedicineRequestHTML(req);
  try {
    // 1. Generate PDF file via expo-print with base64 enabled
    const printResult = await Print.printToFileAsync({ html, base64: true });
    let shareableUri = printResult.uri;
    const safeName = `Medicine_Certificate_${(req.patientName || "Patient").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    // 2. Write to Paths.cache so Android FilePermissionService and FileProvider have clean access
    try {
      if (printResult.base64) {
        const targetFile = new File(Paths.cache, safeName);
        if (targetFile.exists) {
          try {
            targetFile.delete();
          } catch {}
        }
        targetFile.create();
        await targetFile.write(printResult.base64, { encoding: "base64" });
        shareableUri = targetFile.uri;
      }
    } catch (fsErr) {
      console.warn("Could not write to Paths.cache, using original printToFileAsync uri:", fsErr);
    }

    // Ensure valid file:// scheme
    if (!shareableUri.startsWith("file://") && !shareableUri.startsWith("content://")) {
      shareableUri = `file://${shareableUri}`;
    }

    // 3. Share with ExpoSharing
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      try {
        await Sharing.shareAsync(shareableUri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `Share Medicine Certificate to WhatsApp (+91 ${req.phone || ""}) - ${req.patientName}`,
        });
        return shareableUri;
      } catch (shareErr) {
        console.warn("Sharing.shareAsync failed, trying fallback print dialog:", shareErr);
      }
    }

    // Fallback: native print / save as PDF dialog
    await Print.printAsync({ html });
    return shareableUri;
  } catch (err: any) {
    console.warn("PDF generation/sharing error, falling back to Print or Share:", err);
    try {
      // Fallback 1: Native Print / Save as PDF dialog
      await Print.printAsync({ html });
      return null;
    } catch (printErr: any) {
      console.error("Print.printAsync fallback failed:", printErr);
      // Fallback 2: Plain text share
      const medsList = (req.medicines || [])
        .map((m, i) => `${i + 1}. ${m.name} (${m.type || "Pills"}) - ${m.timing}`)
        .join("\n");
      Share.share({
        title: `Medicine Certificate - ${req.patientName}`,
        message:
          `*SPIRITUAL HOMEOPATHY CLINICS*\n` +
          `*Medicine Request Certificate*\n` +
          `Patient: ${req.gender || "Mr."} ${req.patientName}\n` +
          `Branch: ${req.branchName}\n` +
          `Duration: ${req.duration}\n` +
          `Total Fee: ₹${req.totalAmount}\n\n` +
          `Prescribed Remedies:\n${medsList}\n\n` +
          `Helpline: ${getBranchPhone(req.branchName)}`,
      });
      return null;
    }
  }
};

/**
 * Direct native print / save as PDF action
 */
export const printMedicineRequestDirect = async (req: MedicineRequest): Promise<void> => {
  try {
    const html = generateMedicineRequestHTML(req);
    await Print.printAsync({ html });
  } catch (err: any) {
    Alert.alert("Print Error", err?.message || "Could not open print dialog.");
  }
};