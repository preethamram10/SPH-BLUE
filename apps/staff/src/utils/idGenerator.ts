// idGenerator.ts - Clean, Firebase-Free ID Generation

export type BranchCode = "KPB" | "CHN" | "DIL" | "NGL";

/**
 * Maps branch name to its canonical 3-letter registration code.
 */
export const getBranchShortcut = (branchNameOrId?: string): BranchCode => {
  if (!branchNameOrId) return "KPB";
  const b = branchNameOrId.toLowerCase();
  if (b.includes("chanda") || b.includes("chn")) return "CHN";
  if (b.includes("dilshuk") || b.includes("dil") || b.includes("dls")) return "DIL";
  if (b.includes("nalla") || b.includes("ngl") || b.includes("nlg")) return "NGL";
  return "KPB"; // Default to KPHB
};
/**
 * Generates an instant fallback registration ID (Zero-padded 4-digit format).
 * Example: SPH-KPB-0001 or SPH-CHN-0002
 */
export const generateLocalRegistrationId = (branchName?: string, sequenceNumber?: number): string => {
  const shortcut = getBranchShortcut(branchName);
  const sequence = sequenceNumber
    ? String(sequenceNumber).padStart(4, "0")
    : "0001";
  return `SPH-${shortcut}-${sequence}`;
};

/**
 * Server-integrated ID generation calling your backend API.
 */
export const generateRegistrationId = async (
  branchName: string,
  apiBaseUrl?: string
): Promise<string> => {
  const shortcut = getBranchShortcut(branchName);

  if (!apiBaseUrl) {
    return generateLocalRegistrationId(branchName);
  }

  const base = apiBaseUrl.replace(/\/+$/, "");
  const targetUrl = base.endsWith("/api")
    ? `${base}/patients/generate-id?branch=${shortcut}`
    : `${base}/api/patients/generate-id?branch=${shortcut}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data.registrationId || generateLocalRegistrationId(branchName);
  } catch (error) {
    console.warn("API ID generation failed, using fallback sequence:", error);
    return generateLocalRegistrationId(branchName);
  }
};

