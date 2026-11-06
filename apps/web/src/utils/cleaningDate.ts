/**
 * Browser-Safe Date Helpers for Cleaning Audit (DD-MM-YYYY)
 */

export function getTodayDDMMYYYY(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
}

export function toDDMMYYYY(input?: string): string {
  if (!input) return getTodayDDMMYYYY();
  const trimmed = input.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}-${m}-${y}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }
  return trimmed;
}

export function toYYYYMMDD(ddmmyyyy?: string): string {
  if (!ddmmyyyy) return "";
  const trimmed = ddmmyyyy.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("-");
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

