import { DateTime } from "luxon";

export const IST_ZONE = "Asia/Kolkata";

export type DutyShift = "morning" | "day" | "night" | "full_24h" | "custom";

export interface ShiftWindowInput {
  start?: string | null;
  end?: string | null;
}

export interface DutyBreakInput {
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

const DEFAULT_SHIFT_TIMES: Record<DutyShift, { start: string; end: string }> = {
  full_24h: { start: "08:00", end: "08:00" },
  day: { start: "08:00", end: "20:00" },
  night: { start: "20:00", end: "08:00" },
  morning: { start: "07:00", end: "15:00" },
  custom: { start: "08:00", end: "20:00" },
};

/** Current Luxon DateTime anchored strictly in Asia/Kolkata (IST). */
export function nowIST(): DateTime {
  return DateTime.now().setZone(IST_ZONE);
}

/** Current IST calendar date as ISO YYYY-MM-DD. */
export function todayIST(): string {
  return nowIST().toISODate() || "";
}

/** Current IST month as YYYY-MM. */
export function currentMonthIST(): string {
  return nowIST().toFormat("yyyy-MM");
}

/** First and last ISO dates of the current IST month. */
export function currentMonthRangeIST(): { start: string; end: string } {
  const n = nowIST();
  return {
    start: n.startOf("month").toISODate() || "",
    end: n.endOf("month").toISODate() || "",
  };
}

/** Parse any date string / Date into a Luxon DateTime in IST. */
export function parseIST(value?: string | Date | null): DateTime | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return DateTime.fromJSDate(value, { zone: IST_ZONE });
  }
  const s = String(value).trim();
  if (!s) return null;
  // Date-only ISO string ("2026-11-01") -> IST midnight of that date
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const dt = DateTime.fromISO(s, { zone: IST_ZONE });
    return dt.isValid ? dt : null;
  }
  // Full ISO timestamp with offset / Z -> convert to IST
  let dt = DateTime.fromISO(s, { setZone: true });
  if (!dt.isValid) {
    dt = DateTime.fromSQL(s, { zone: IST_ZONE });
  }
  if (!dt.isValid) {
    const js = new Date(s);
    if (!Number.isNaN(js.getTime())) {
      dt = DateTime.fromJSDate(js, { zone: IST_ZONE });
    }
  }
  return dt.isValid ? dt.setZone(IST_ZONE) : null;
}

/** Combine an ISO date ("YYYY-MM-DD") and "HH:MM" clock time strictly in IST. */
export function combineDateTimeIST(dateIso?: string | null, hhmm?: string | null): DateTime | null {
  if (!dateIso || !hhmm) return null;
  const d = parseIST(dateIso.slice(0, 10));
  if (!d) return null;
  const parts = String(hhmm).trim().split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return d.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

/** Format "HH:MM" -> "07:00 AM" cleanly with Luxon. */
export function formatTime12hIST(value?: string | null): string {
  if (!value) return "";
  const parts = String(value).trim().split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  return DateTime.fromObject({ hour: h, minute: m }, { zone: IST_ZONE }).toFormat("hh:mm a");
}

/** Weekday short name ("Sun", "Mon", ...) in IST for a YYYY-MM-DD string. */
export function weekdayIST(dateIso?: string | null): string {
  const dt = parseIST(dateIso);
  return dt ? dt.toFormat("ccc") : "";
}

/** Month display ("November 2026") in IST for YYYY-MM. */
export function monthLabelIST(monthStr?: string | null): string {
  if (!monthStr) return "";
  const dt = DateTime.fromFormat(monthStr.trim(), "yyyy-MM", { zone: IST_ZONE });
  return dt.isValid ? dt.toFormat("MMMM yyyy") : monthStr;
}

/** Full readable date ("01 Nov 2026, Sun") in IST. */
export function formatDateWithDayIST(dateIso?: string | null): string {
  const dt = parseIST(dateIso);
  return dt ? dt.toFormat("ccc, dd MMM yyyy") : dateIso || "—";
}

/** Format ISO date ("YYYY-MM-DD") as "DD/MM/YYYY" in IST. */
export function formatSlashDateIST(value?: string | Date | null): string {
  const dt = parseIST(value);
  return dt ? dt.toFormat("dd/MM/yyyy") : "—";
}

/** Format "01 Nov 07:00 AM -> 02 Nov 07:00 AM" (or same-day "08:00 AM - 08:00 PM") strictly in IST via Luxon. */
export function formatAttendanceWindowIST(
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
  const baseDate = parseIST(dateIso);
  if (!baseDate) {
    return `${formatTime12hIST(startTime)}${dash}${formatTime12hIST(endTime)}`;
  }

  if (startTime && endTime) {
    const startDt = combineDateTimeIST(dateIso, startTime);
    let endDt = combineDateTimeIST(dateIso, endTime);
    if (!startDt || !endDt) {
      return `${formatTime12hIST(startTime)}${dash}${formatTime12hIST(endTime)}`;
    }
    const spansNextDay =
      (shift === "full_24h" && status !== "half_day" && endDt <= startDt) ||
      (shift === "full_24h" && status !== "half_day" && startTime === endTime) ||
      endDt <= startDt;

    if (spansNextDay) {
      if (endDt <= startDt) {
        endDt = endDt.plus({ days: 1 });
      }
      return `${startDt.toFormat("dd MMM hh:mm a")}${sep}${endDt.toFormat("dd MMM hh:mm a")}`;
    }

    return `${startDt.toFormat("hh:mm a")}${dash}${endDt.toFormat("hh:mm a")}`;
  }

  if (startTime) {
    const startDt = combineDateTimeIST(dateIso, startTime);
    if (!startDt) return `from ${formatTime12hIST(startTime)}`;
    if (shift === "full_24h") {
      const nextDt = startDt.plus({ days: 1 });
      return `${startDt.toFormat("dd MMM hh:mm a")}${sep}${nextDt.toFormat("dd MMM hh:mm a")}`;
    }
    return `from ${startDt.toFormat("hh:mm a")}`;
  }

  return ascii ? "-" : "—";
}

/** Format an array of ShiftWindows for a given IST date (cross-midnight windows show next day). */
export function formatShiftWindowsIST(
  dateIso: string,
  windows: ShiftWindowInput[],
  ascii = false
): string {
  return windows
    .map((w) =>
      formatAttendanceWindowIST(
        dateIso,
        "custom",
        w.start ?? undefined,
        w.end ?? undefined,
        "present",
        ascii
      )
    )
    .join(", ");
}

/**
 * Exact Luxon IST duty duration calculation — matches backend `calculate_duty_days_ist`
 * so the Admin UI preview (Assignment form, Replace dialog, Break dialog) never disagrees
 * with backend billing or payslips.
 */
export function calculateDutyScheduleIST(params: {
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  shift?: string | null;
  shiftWindows?: ShiftWindowInput[] | null;
  dutyBreaks?: DutyBreakInput[] | null;
  isHandover?: boolean;
}): {
  days: number;
  hours: number;
  startLabel: string;
  endLabel: string;
} | null {
  const { startDate, endDate, startTime, endTime, shiftWindows, dutyBreaks, isHandover } = params;
  const shift = ((params.shift || "full_24h") as DutyShift) in DEFAULT_SHIFT_TIMES
    ? (params.shift as DutyShift)
    : "full_24h";
  if (!startDate || !endDate) return null;

  const sDate = parseIST(startDate);
  const eDate = parseIST(endDate);
  if (!sDate || !eDate || eDate < sDate) return null;

  const def = DEFAULT_SHIFT_TIMES[shift];
  const stStr = startTime || def.start;
  const etStr = endTime || (shift === "full_24h" ? stStr : def.end);

  const sDt = combineDateTimeIST(sDate.toISODate(), stStr);
  const eDt = combineDateTimeIST(eDate.toISODate(), etStr);
  if (!sDt || !eDt) return null;

  let grossDays = 0;
  let totalHours = 0;

  if (shift === "full_24h" && startTime && endTime) {
    let effEnd = eDt;
    if (effEnd.toMillis() === sDt.toMillis()) {
      if (isHandover) {
        return { days: 0, hours: 0, startLabel: sDt.toFormat("dd MMM, hh:mm a"), endLabel: eDt.toFormat("dd MMM, hh:mm a") };
      }
      effEnd = sDt.plus({ hours: 24 });
    } else if (effEnd < sDt) {
      return null;
    }
    totalHours = effEnd.diff(sDt, "hours").hours;
    grossDays = Math.round((totalHours / 24) * 2) / 2;
  } else {
    const calDiff = Math.round(eDate.startOf("day").diff(sDate.startOf("day"), "days").days);
    const calDays = calDiff + 1;
    const stMin = sDt.hour * 60 + sDt.minute;
    const etMin = eDt.hour * 60 + eDt.minute;

    if (shift === "custom" && shiftWindows && calDiff === 1 && shiftWindows.length >= 2) {
      grossDays = Math.max(calDays, shiftWindows.length);
    } else if (startTime && endTime) {
      if (calDiff === 0) {
        grossDays = isHandover && etMin === stMin ? 0 : 1;
      } else if (etMin <= stMin) {
        grossDays = calDiff;
      } else if (isHandover && (shift === "day" || shift === "night") && etMin - stMin <= 360) {
        grossDays = calDiff + 0.5;
      } else {
        grossDays = calDays;
      }
    } else {
      grossDays = calDays;
    }
    const perDayHours = shift === "morning" ? 8 : shift === "full_24h" ? 24 : 12;
    totalHours = grossDays * perDayHours;
  }

  let breakDays = 0;
  if (dutyBreaks && dutyBreaks.length) {
    for (const b of dutyBreaks) {
      const bStart = parseIST(b.start_date);
      const bEnd = parseIST(b.end_date);
      if (!bStart || !bEnd || bEnd < bStart) continue;
      if (b.start_time && b.end_time) {
        const bs = combineDateTimeIST(bStart.toISODate(), b.start_time);
        let be = combineDateTimeIST(bEnd.toISODate(), b.end_time);
        if (bs && be) {
          if (be.toMillis() === bs.toMillis() && bStart.hasSame(bEnd, "day")) {
            be = bs.plus({ days: 1 });
          } else if (be <= bs) {
            be = be.plus({ days: 1 });
          }
          const bHours = be.diff(bs, "hours").hours;
          breakDays += shift === "full_24h"
            ? Math.round((bHours / 24) * 2) / 2
            : Math.round(bEnd.diff(bStart, "days").days) + (b.end_time <= b.start_time ? 0 : 1);
        }
      } else {
        breakDays += Math.round(bEnd.diff(bStart, "days").days) + 1;
      }
    }
  }

  const netDays = Math.max(0, Math.round((grossDays - breakDays) * 2) / 2);
  return {
    days: netDays,
    hours: Math.round(totalHours * 10) / 10,
    startLabel: sDt.toFormat("dd MMM, hh:mm a"),
    endLabel: eDt.toFormat("dd MMM, hh:mm a"),
  };
}

/** Format an IST duty-break / leave range & dynamic duration for UI display. */
export function computeBreakSummaryIST(
  startDate?: string | null,
  endDate?: string | null,
  startTime?: string | null,
  endTime?: string | null
): { label: string; days: number; hours: number } {
  const sD = parseIST(startDate);
  const eD = parseIST(endDate || startDate);
  if (!sD || !eD) {
    return { label: "—", days: 0, hours: 0 };
  }
  const sIso = sD.toISODate() || "";
  const eIso = eD.toISODate() || "";
  if (startTime && endTime) {
    const bs = combineDateTimeIST(sIso, startTime);
    let be = combineDateTimeIST(eIso, endTime);
    if (bs && be) {
      if (be.toMillis() === bs.toMillis() && sD.hasSame(eD, "day")) {
        be = bs.plus({ days: 1 });
      } else if (be <= bs) {
        be = be.plus({ days: 1 });
      }
      const hrs = Math.round(be.diff(bs, "hours").hours * 10) / 10;
      const days = Math.round((hrs / 24) * 2) / 2;
      return {
        label: `${bs.toFormat("dd MMM yyyy, hh:mm a")} → ${be.toFormat("dd MMM yyyy, hh:mm a")}`,
        days,
        hours: hrs,
      };
    }
  }
  const days = Math.max(1, Math.round(eD.startOf("day").diff(sD.startOf("day"), "days").days) + 1);
  return {
    label: sD.hasSame(eD, "day")
      ? sD.toFormat("dd MMM yyyy")
      : `${sD.toFormat("dd MMM yyyy")} → ${eD.toFormat("dd MMM yyyy")}`,
    days,
    hours: days * 24,
  };
}
