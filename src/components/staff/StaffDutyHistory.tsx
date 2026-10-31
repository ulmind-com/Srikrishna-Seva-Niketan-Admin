import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FolderClock,
  MapPin,
  Search,
} from "lucide-react";
import { staffPortalService, type StaffAssignment } from "@/services/staff-portal.service";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AssignmentDetailSheet } from "./AssignmentDetailSheet";

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
    return new Date(iso).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export function StaffDutyHistory() {
  const [search, setSearch] = useState("");
  const [selectedDuty, setSelectedDuty] = useState<StaffAssignment | null>(null);

  const dutiesQuery = useQuery({
    queryKey: ["staff-assignments"],
    queryFn: () => staffPortalService.assignments(),
  });

  const allItems = dutiesQuery.data?.items ?? [];

  // Completed duties (or duties marked completed locally)
  let locallyCompleted: Set<string> = new Set();
  try {
    const raw = sessionStorage.getItem("ssn_completed_duties");
    if (raw) locallyCompleted = new Set(JSON.parse(raw));
  } catch {}

  const completedDuties = allItems.filter(
    (a) => a.status === "completed" || locallyCompleted.has(a.id) || Boolean(a.work_completed_at)
  );

  const filtered = completedDuties.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.customer_name.toLowerCase().includes(q) ||
      (a.address && a.address.toLowerCase().includes(q)) ||
      (a.place_name && a.place_name.toLowerCase().includes(q))
    );
  });

  // Calculate statistics
  const totalCompleted = completedDuties.length;
  const totalDays = completedDuties.reduce((acc, a) => acc + (a.total_days || 1), 0);
  const totalCashHandled = completedDuties.reduce((acc, a) => {
    if (a.payment_type === "postpaid" && a.collect_amount) {
      return acc + a.collect_amount;
    }
    return acc;
  }, 0);

  return (
    <>
      <div className="space-y-4">
        {/* Statistics Hero Banner */}
        <div className="grid grid-cols-3 gap-2.5 rounded-2xl bg-gradient-to-br from-card via-card to-muted/50 p-4 border border-border shadow-soft">
          <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {totalCompleted}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-0.5">
              মোট কাজ সম্পন্ন
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <span className="text-xl sm:text-2xl font-black text-emerald-500 tracking-tight">
              {totalDays}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-0.5">
              কাজের দিন (Days)
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <span className="text-xl sm:text-2xl font-black text-amber-500 tracking-tight">
              ₹{totalCashHandled.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-0.5">
              ক্যাশ রিসিভড
            </span>
          </div>
        </div>

        {/* Search Bar */}
        {completedDuties.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="কাস্টমার বা ঠিকানা দিয়ে সার্চ করুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card rounded-xl text-xs h-10 border-border"
            />
          </div>
        )}

        {/* List of completed duties */}
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <FolderClock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                কাজের রেকর্ড ও ইতিহাস (Duty History)
              </h2>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {completedDuties.length} Recorded
            </Badge>
          </div>

          {dutiesQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              লোড হচ্ছে...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {search ? "কোনো ম্যাচ পাওয়া যায়নি" : "এখনো কোনো কাজ সম্পন্ন হয়নি"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                যেসব দায়িত্ব আপনি সম্পন্ন করবেন সেগুলো স্বয়ংক্রিয়ভাবে এখানে চিরস্থায়ী রেকর্ড হিসেবে জমা থাকবে।
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((duty) => (
                <li key={duty.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDuty(duty)}
                    className="flex w-full items-start gap-3.5 p-4 text-left transition hover:bg-muted/40 active:bg-muted/60"
                  >
                    <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-bold text-foreground">
                          {duty.customer_name}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                          ✓ সম্পন্ন (Completed)
                        </span>
                        {duty.payment_type === "postpaid" ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                            Cash: ₹{(duty.collect_amount ?? 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-500 border border-cyan-500/20">
                            Prepaid
                          </span>
                        )}
                      </div>

                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                        <span>
                          {PLACE_LABEL[duty.place_type] ?? duty.place_type}
                          {duty.address ? ` · ${duty.address}` : ""}
                        </span>
                      </p>

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {fmtDate(duty.start_date)} → {fmtDate(duty.end_date)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {SHIFT_LABEL[duty.shift] ?? duty.shift}
                        </span>
                        {duty.work_completed_at && (
                          <span className="text-[10px] text-muted-foreground/70">
                            সম্পন্ন: {fmtDateTime(duty.work_completed_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0 self-center" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Detail Sheet on click */}
      <AssignmentDetailSheet
        assignment={selectedDuty}
        open={Boolean(selectedDuty)}
        onOpenChange={(open) => !open && setSelectedDuty(null)}
      />
    </>
  );
}
