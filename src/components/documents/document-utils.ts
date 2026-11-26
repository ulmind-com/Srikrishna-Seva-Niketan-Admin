import {
  formatAttendanceWindowIST,
  formatDateWithDayIST,
  formatShiftWindowsIST,
  formatSlashDateIST,
  formatTime12hIST,
} from "@/lib/ist-datetime";

export const ORG_NAME = "Srikrishna Seva Niketan";
export const ORG_DEPARTMENT = "NURSING & HOME HEALTH CARE";
export const ORG_TAGLINE = "Nursing · Aaya · Attendant Services";

/** Printed brand logo for the ID card and application forms. */
export const ORG_LOGO = "/brand/ssn-logo.webp";

/** Format `"18:00"` -> `"06:00 PM"`, `"07:00"` -> `"07:00 AM"`. */
export const formatTime12h = formatTime12hIST;

/** Format ISO date + optional `"HH:MM"` clock time cleanly for bills & statements. */
export function formatDateWithTime(dateStr?: string | null, timeStr?: string | null): string {
  const d = formatSlashDateIST(dateStr);
  const t = formatTime12hIST(timeStr);
  return t ? `${d} (${t})` : d;
}

/** Format an attendance day's duty window in IST (shows next-day date for 24h & overnight shifts). */
export const formatAttendanceWindow = formatAttendanceWindowIST;
export { formatShiftWindowsIST, formatDateWithDayIST };

/** Format an ISO date (or null) as `DD/MM/YYYY` in IST for printed documents. */
export const formatDate = formatSlashDateIST;

/** Convert a numeric INR amount into Indian English words (e.g. 13500 -> "Rupees Thirteen Thousand Five Hundred Only"). */
export function amountInWordsINR(num?: number | null): string {
  if (num == null || isNaN(num) || num <= 0) return "—";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertSection(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) {
      const rem = n % 10;
      return tens[Math.floor(n / 10)] + (rem ? " " + ones[rem] : "");
    }
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return ones[hundred] + " Hundred" + (rest ? " " + convertSection(rest) : "");
  }

  const integerPart = Math.floor(Math.abs(num));
  if (integerPart === 0) return "Rupees Zero Only";

  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertSection(crore) + " Crore");
  if (lakh > 0) parts.push(convertSection(lakh) + " Lakh");
  if (thousand > 0) parts.push(convertSection(thousand) + " Thousand");
  if (remainder > 0) parts.push(convertSection(remainder));

  return "Rupees " + parts.join(" ") + " Only";
}

/** Human label for a verification status. */
export const VERIFICATION_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Awaiting verification",
  verified: "Verified",
  rejected: "Needs changes",
};

/** Badge variant per verification status. */
export const VERIFICATION_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "danger" | "muted"
> = {
  draft: "muted",
  pending: "warning",
  verified: "success",
  rejected: "danger",
};
