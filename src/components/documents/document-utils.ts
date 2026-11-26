export const ORG_NAME = "Srikrishna Seva Niketan";
export const ORG_DEPARTMENT = "NURSING & HOME HEALTH CARE";
export const ORG_TAGLINE = "Nursing · Aaya · Attendant Services";

/** Printed brand logo for the ID card and application forms. */
export const ORG_LOGO = "/brand/ssn-logo.webp";

/** Format `"18:00"` -> `"06:00 PM"`, `"07:00"` -> `"07:00 AM"`. */
export function formatTime12h(value?: string | null): string {
  if (!value) return "";
  const [h, m] = value.split(":");
  const hi = Number(h);
  const mi = Number(m);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return value;
  const suffix = hi < 12 ? "AM" : "PM";
  const hr12 = String(hi % 12 || 12).padStart(2, "0");
  return `${hr12}:${String(mi).padStart(2, "0")} ${suffix}`;
}

/** Format ISO date + optional `"HH:MM"` clock time cleanly for bills & statements. */
export function formatDateWithTime(dateStr?: string | null, timeStr?: string | null): string {
  const d = formatDate(dateStr);
  const t = formatTime12h(timeStr);
  return t ? `${d} (${t})` : d;
}

function shortDayMonth(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function addOneDayIso(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
    next.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Format an attendance day's duty window clearly — for 24h and overnight shifts
 * shows the explicit start date + time into the next day (e.g. "01 Nov 07:00 AM → 02 Nov 07:00 AM").
 */
export function formatAttendanceWindow(
  dateIso: string,
  shift?: string | null,
  startTime?: string | null,
  endTime?: string | null,
  status?: string | null,
  ascii = false
): string {
  const sep = ascii ? " -> " : " → ";
  const dash = ascii ? " - " : " – ";
  if (!startTime && !endTime) return ascii ? "-" : "—";
  if (startTime && endTime) {
    const isOvernight =
      (shift === "full_24h" && status !== "half_day") || endTime <= startTime;
    if (isOvernight && status !== "half_day") {
      return `${shortDayMonth(dateIso)} ${formatTime12h(startTime)}${sep}${shortDayMonth(
        addOneDayIso(dateIso)
      )} ${formatTime12h(endTime)}`;
    }
    if (status === "half_day" && endTime <= startTime) {
      return `from ${shortDayMonth(dateIso)} ${formatTime12h(startTime)} (12 hrs)`;
    }
    return `${formatTime12h(startTime)}${dash}${formatTime12h(endTime)}`;
  }
  if (startTime) {
    return shift === "full_24h"
      ? `${shortDayMonth(dateIso)} ${formatTime12h(startTime)} (24 hrs)`
      : `from ${formatTime12h(startTime)}`;
  }
  return ascii ? "-" : "—";
}

/** Format an ISO date (or null) as `DD/MM/YYYY` for printed documents. */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
