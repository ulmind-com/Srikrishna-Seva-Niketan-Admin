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
