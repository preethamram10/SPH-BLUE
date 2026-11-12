export const CANONICAL_BRANCH_PHONES: Record<string, string> = {
  nallagandla: "+91 91321 76176",
  dilshuknagar: "+91 98041 76176",
  chandanagar: "+91 95531 76176",
  kphb: "+91 90301 76176",
};

export function getBranchPhone(branchName: string = "", fallbackPhone?: string): string {
  const lower = (branchName || "").toLowerCase().replace(/branch/gi, "").trim();
  if (lower.includes("nalla") || lower.includes("nlg")) return CANONICAL_BRANCH_PHONES.nallagandla;
  if (lower.includes("dilshuk") || lower.includes("dilsukh") || lower.includes("dsnr") || lower.includes("dil")) return CANONICAL_BRANCH_PHONES.dilshuknagar;
  if (lower.includes("chanda") || lower.includes("cngr") || lower.includes("chn")) return CANONICAL_BRANCH_PHONES.chandanagar;
  if (lower.includes("kphb") || lower.includes("kpb") || lower.includes("kukatpally")) return CANONICAL_BRANCH_PHONES.kphb;
  if (fallbackPhone && String(fallbackPhone).trim()) {
    const raw = String(fallbackPhone).replace(/\D/g, "").slice(-10);
    if (raw.length === 10) return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
    return String(fallbackPhone).trim();
  }
  return CANONICAL_BRANCH_PHONES.kphb;
}

