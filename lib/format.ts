/**
 * Formatting helpers. Calendar dates (YYYY-MM-DD) and local datetimes
 * (YYYY-MM-DDTHH:mm:ss, no zone) are read as local time, never shifted.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Organisation display settings (Settings will own these later). */
export const LOCALE = "en-IN";
export const CURRENCY = "INR";

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIsoDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Now as a local datetime string, the format stored on records. */
export function nowIso(): string {
  const d = new Date();
  return `${toIsoDate(d)}T${d.toTimeString().slice(0, 8)}`;
}

/** "Oct 14, 2026" */
export function formatDate(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Oct 14" */
export function formatShortDate(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "10:45 AM" */
export function formatTime(iso: string): string {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "Oct 14, 2026, 10:45 AM" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "Oct 8 – Oct 14, 2026" */
export function formatRange(start: string, end: string): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${sameYear ? formatShortDate(start) : formatDate(start)} – ${formatDate(end)}`;
}

const numberFmt = new Intl.NumberFormat(LOCALE);
const moneyFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
const moneyFmt2 = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "48,762" (Indian grouping) */
export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

/** "₹2,35,48,320" */
export function formatCurrency(amount: number, { decimals = false } = {}): string {
  return (decimals ? moneyFmt2 : moneyFmt).format(amount);
}

/** "+120" / "−15" with a true minus sign. */
export function formatSigned(n: number): string {
  if (n > 0) return `+${formatNumber(n)}`;
  if (n < 0) return `−${formatNumber(Math.abs(n))}`;
  return "0";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
