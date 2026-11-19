/**
 * Formats any time string, Date object, or ISO timestamp into
 * Indian Standard Time (IST) 12-hour format (e.g. "09:00 AM", "01:45 PM", "06:30:15 PM").
 */
export function formatToIST12Hour(input?: string | Date | null): string {
  if (!input) return "";
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return "";
    return input.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
  const trimmed = String(input).trim();
  if (
    !trimmed ||
    trimmed === "-" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return "";
  }

  // 12-hour format like '09:30 AM' or '1:45:12 PM'
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    const h = parseInt(match12[1], 10);
    const m = match12[2];
    const s = match12[3];
    const ampm = match12[4].toUpperCase();
    const hStr = String(h).padStart(2, "0");
    return s ? `${hStr}:${m}:${s} ${ampm}` : `${hStr}:${m} ${ampm}`;
  }

  // 24-hour format like '14:30' or '09:15:20'
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const s = match24[3];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hStr = String(h).padStart(2, "0");
    return s ? `${hStr}:${m}:${s} ${ampm}` : `${hStr}:${m} ${ampm}`;
  }

  // ISO string or parseable date string (convert UTC to IST)
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  return trimmed;
}
