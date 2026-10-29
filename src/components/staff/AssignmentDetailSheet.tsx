import { CalendarClock, MapPin, Phone, Clock, CalendarDays } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { StaffAssignment } from "@/services/staff-portal.service";
import { AssignmentRouteMap } from "./AssignmentRouteMap";

const PLACE_LABEL: Record<string, string> = {
  home: "Customer's Home",
  hospital: "Hospital",
  nursing_home: "Nursing Home",
  other: "Other",
};
const SHIFT_LABEL: Record<string, string> = {
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "Ongoing";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function Row({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

interface Props {
  assignment: StaffAssignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full duty details for the nurse — no price of any kind — with a live
 * route map from their location to the customer.
 */
export function AssignmentDetailSheet({ assignment, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {assignment && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>{assignment.customer_name}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 divide-y divide-border">
              {assignment.customer_phone && (
                <Row icon={Phone} label="Contact">
                  <a href={`tel:${assignment.customer_phone}`} className="text-primary hover:underline">
                    {assignment.customer_phone}
                  </a>
                </Row>
              )}
              <Row icon={MapPin} label="Posted at">
                {PLACE_LABEL[assignment.place_type] ?? assignment.place_type}
                {assignment.place_name ? ` — ${assignment.place_name}` : ""}
              </Row>
              {assignment.address && (
                <Row icon={MapPin} label="Address">
                  {assignment.address}
                </Row>
              )}
              <Row icon={CalendarClock} label="Period">
                {fmtDate(assignment.start_date)} → {fmtDate(assignment.end_date)}
              </Row>
              {assignment.total_days != null && (
                <Row icon={CalendarDays} label="Duration">
                  {assignment.total_days} day{assignment.total_days === 1 ? "" : "s"}
                  {assignment.days_remaining != null ? ` · ${assignment.days_remaining} left` : ""}
                </Row>
              )}
              <Row icon={Clock} label="Shift">
                {SHIFT_LABEL[assignment.shift] ?? assignment.shift}
              </Row>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Route to duty location</p>
              <AssignmentRouteMap assignment={assignment} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
