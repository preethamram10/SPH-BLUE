/**
 * Normalizes any date string (YYYY-MM-DD, DD-MM-YYYY, DD-MM-YY, 00YY-MM-DD, or corrupted 20YY-MM-YYYY)
 * to a standard YYYY-MM-DD string.
 */
export function normalizeDateStr(dt?: string | null): string {
  if (!dt) return "";
  const cleaned = dt.trim().split("T")[0].replace(/\//g, "-");
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    // If corrupted format like 2012-11-2026 (both parts[0] and parts[2] are 4 digits)
    if (parts[0].length === 4 && parts[2].length === 4) {
      const y = parts[2];
      const m = parts[1].padStart(2, "0");
      const d = parts[0].slice(2).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    // If already YYYY-MM-DD (4-digit first part, e.g. 2026-11-12 or 0018-05-21)
    if (parts[0].length === 4) {
      let yr = parseInt(parts[0], 10);
      if (yr < 100) yr = 2000 + yr;
      const m = parts[1].padStart(2, "0");
      const d = parts[2].padStart(2, "0");
      return `${yr}-${m}-${d}`;
    }
    // If DD-MM-YYYY (4-digit last part, e.g. 12-11-2026)
    if (parts[2].length === 4) {
      let yr = parseInt(parts[2], 10);
      if (yr < 100) yr = 2000 + yr;
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      return `${yr}-${m}-${d}`;
    }
    // If 2-digit year at end: DD-MM-YY (e.g. 21-05-18)
    if (parts[0].length <= 2 && parts[2].length <= 2) {
      let yr = 2000 + parseInt(parts[2], 10);
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      return `${yr}-${m}-${d}`;
    }
  }
  return cleaned;
}

