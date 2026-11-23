export const ORG_NAME = "Srikrishna Seva Niketan";
export const ORG_DEPARTMENT = "NURSING & HOME HEALTH CARE";
export const ORG_TAGLINE = "Nursing · Aaya · Attendant Services";

/** Printed brand logo for the ID card and application forms. */
export const ORG_LOGO = "/brand/ssn-logo.webp";

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
