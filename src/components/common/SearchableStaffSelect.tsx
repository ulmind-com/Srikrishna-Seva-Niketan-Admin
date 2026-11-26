import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Check,
  User,
  X,
  Stethoscope,
  Building2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { resolveStaffDutyBadge, STAFF_BADGE_CLASSES } from "@/lib/staff-status";
import type { Employee } from "@/types/models";

interface SearchableStaffSelectProps {
  staffList: Employee[];
  value?: string;
  onChange: (employeeId: string, employee?: Employee) => void;
  branchMap?: Record<string, string>;
  targetLocationId?: string;
  excludeEmployeeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableStaffSelect({
  staffList,
  value,
  onChange,
  branchMap = {},
  targetLocationId,
  excludeEmployeeIds = [],
  placeholder = "Choose available staff member...",
  disabled = false,
  className = "",
}: SearchableStaffSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Selected employee object
  const selectedEmp = useMemo(
    () => staffList.find((e) => e.id === value),
    [staffList, value]
  );

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const excludeSet = new Set(excludeEmployeeIds);

    return staffList.filter((emp) => {
      if (excludeSet.has(emp.id)) return false;
      if (!(emp.is_active ?? true)) return false;

      // Category filter
      if (categoryFilter !== "all") {
        const cat = (emp.category || "").toLowerCase();
        if (categoryFilter === "nurse" && !cat.includes("nurse")) return false;
        if (
          categoryFilter === "aaya" &&
          !cat.includes("aaya") &&
          !cat.includes("attendant")
        )
          return false;
      }

      if (!q) return true;

      const nameMatch = (emp.name || "").toLowerCase().includes(q);
      const codeMatch = (emp.code || "").toLowerCase().includes(q);
      const phoneMatch = (emp.phone || "").toLowerCase().includes(q);
      const catMatch = (emp.category || "").toLowerCase().includes(q);
      const branchName = (branchMap[emp.location_id] || "").toLowerCase();
      const branchMatch = branchName.includes(q);

      return nameMatch || codeMatch || phoneMatch || catMatch || branchMatch;
    });
  }, [staffList, excludeEmployeeIds, searchQuery, categoryFilter, branchMap]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) setIsOpen((prev) => !prev);
          }
        }}
        className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all cursor-pointer select-none ${
          disabled
            ? "cursor-not-allowed opacity-50 bg-muted/40 border-border"
            : isOpen
            ? "border-primary ring-2 ring-primary/20 bg-card shadow-sm"
            : "border-border/90 bg-card hover:border-primary/50"
        }`}
      >
        {selectedEmp ? (
          <div className="flex flex-wrap items-center gap-2 truncate">
            <span className="font-semibold text-foreground text-sm">
              {selectedEmp.name}
            </span>
            {selectedEmp.code && (
              <span className="font-mono text-xs text-muted-foreground">
                ({selectedEmp.code})
              </span>
            )}
            {selectedEmp.category && (
              <Badge
                variant="secondary"
                className="text-[10px] py-0 px-1.5 capitalize font-medium"
              >
                {selectedEmp.category}
              </Badge>
            )}
            {branchMap[selectedEmp.location_id] && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {branchMap[selectedEmp.location_id]}
              </span>
            )}
            {targetLocationId && selectedEmp.location_id === targetLocationId && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 text-emerald-500 border-emerald-500/30"
              >
                Same Branch
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <User className="h-4 w-4 opacity-60" />
            <span>{placeholder}</span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {selectedEmp && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("", undefined);
              }}
              className="p-1 hover:text-destructive rounded-full transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-2xl border border-border bg-card p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search staff by name, code, phone, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs bg-muted/40 border-border focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-border/60 overflow-x-auto text-[11px]">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({staffList.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("nurse")}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                categoryFilter === "nurse"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Nurses
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("aaya")}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                categoryFilter === "aaya"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Aaya / Attendants
            </button>
          </div>

          {/* Staff List */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-1 pt-1.5 scrollbar-thin">
            {filteredStaff.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground space-y-1">
                <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground/60" />
                <p>কোনো স্টাফ পাওয়া যায়নি</p>
                {searchQuery && (
                  <p className="text-[11px] opacity-75">
                    "{searchQuery}" ফিল্টারে কেউ মিলছে না
                  </p>
                )}
              </div>
            ) : (
              filteredStaff.map((emp) => {
                const isSelected = emp.id === value;
                const branch = branchMap[emp.location_id] || "";
                const isSameBranch =
                  targetLocationId && emp.location_id === targetLocationId;

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      onChange(emp.id, emp);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary/15 text-primary font-medium"
                        : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Stethoscope className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-xs">
                            {emp.name}
                          </span>
                          {emp.code && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ({emp.code})
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          {emp.category && (
                            <span className="capitalize font-medium text-foreground/80">
                              {emp.category}
                            </span>
                          )}
                          {branch && (
                            <span>• {branch}</span>
                          )}
                          {isSameBranch && (
                            <span className="text-emerald-500 font-medium">
                              (Same Branch)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {(() => {
                        const b = resolveStaffDutyBadge(emp);
                        return (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none whitespace-nowrap ${
                              STAFF_BADGE_CLASSES[b.tone]
                            }`}
                          >
                            {b.text}
                          </span>
                        );
                      })()}
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
