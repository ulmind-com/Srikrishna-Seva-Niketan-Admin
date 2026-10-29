import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle2,
  Flame,
  Loader2,
  Radio,
  Send,
  Smartphone,
  Users,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { resourceServices } from "@/services/resources";
import {
  pushNotificationService,
  type PushDispatchPayload,
} from "@/services/push-notification.service";
import { playSynthesizedChime } from "@/utils/audioAlert";

const PRESET_TEMPLATES = [
  {
    name: "Urgent Duty",
    icon: Flame,
    title: "🚨 Urgent Duty Assignment",
    message: "New high-priority patient duty assigned. Please check patient location and report on time.",
    urgency: "high" as const,
  },
  {
    name: "Shift Updated",
    icon: Radio,
    title: "⏰ Shift Schedule Updated",
    message: "Your duty roster or shift timings have been modified by the admin office. Please review.",
    urgency: "normal" as const,
  },
  {
    name: "Route Pin Set",
    icon: CheckCircle2,
    title: "📍 Customer Location Confirmed",
    message: "Accurate road route and customer GPS pin are ready. Open map to begin navigation.",
    urgency: "normal" as const,
  },
  {
    name: "Emergency Call",
    icon: Bell,
    title: "⚠️ EMERGENCY: Immediate Nurse Required",
    message: "Urgent clinical assistance requested at patient residence. Please acknowledge immediately.",
    urgency: "high" as const,
  },
];

interface PushDispatchModalProps {
  initialEmployeeId?: string;
  initialEmployeeName?: string;
  triggerButton?: React.ReactNode;
}

export function PushDispatchModal({
  initialEmployeeId,
  initialEmployeeName,
  triggerButton,
}: PushDispatchModalProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"all_nurses" | "employee" | "all_admins">(
    initialEmployeeId ? "employee" : "all_nurses"
  );
  const [employeeId, setEmployeeId] = useState<string>(initialEmployeeId || "");
  const [title, setTitle] = useState("🚨 Urgent Duty Assignment");
  const [message, setMessage] = useState(
    "New high-priority patient duty assigned. Please open portal to view location and road route."
  );
  const [urgency, setUrgency] = useState<"normal" | "high">("high");
  const [link, setLink] = useState("/staff/status");

  const qc = useQueryClient();

  // Query registered active push device count
  const statusQuery = useQuery({
    queryKey: ["push-subscribers-status"],
    queryFn: () => pushNotificationService.getPushStatus(),
    enabled: open,
    refetchInterval: 15_000,
  });

  // Query verified nurses for targeting
  const employeesQuery = useQuery({
    queryKey: ["employees-push-list"],
    queryFn: () => resourceServices.employees.list({ page_size: 100 }),
    enabled: open,
  });

  const activeStaffDevices = statusQuery.data?.active_staff_devices ?? 0;
  const employees = employeesQuery.data?.items ?? [];

  const dispatchMutation = useMutation({
    mutationFn: (payload: PushDispatchPayload) =>
      pushNotificationService.dispatchPush(payload),
    onSuccess: (data) => {
      playSynthesizedChime();
      toast.success("Push notification dispatched!", {
        description: `Delivered to ${data.sent} active device(s).`,
      });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to dispatch push";
      toast.error("Push delivery failed", { description: msg });
    },
  });

  const handleSend = () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter message content");
      return;
    }
    if (target === "employee" && !employeeId) {
      toast.error("Please select a recipient nurse");
      return;
    }

    dispatchMutation.mutate({
      target,
      employee_id: target === "employee" ? employeeId : undefined,
      title: title.trim(),
      message: message.trim(),
      urgency,
      link: link.trim() || "/staff/status",
    });
  };

  const applyTemplate = (tmpl: (typeof PRESET_TEMPLATES)[number]) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setUrgency(tmpl.urgency);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="brand-gradient font-medium text-white shadow-md hover:brightness-110 gap-2">
            <Send className="h-4 w-4" /> Push Duty Alert
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Dispatch Real-time Push Alert
              </DialogTitle>
              <DialogDescription className="text-xs">
                Send an immediate Web Push notification that rings & vibrates nurse devices.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Live Device Status Bar */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-foreground">
              {activeStaffDevices} nurse device(s) registered for instant push
            </span>
          </div>
          <Badge variant={activeStaffDevices > 0 ? "secondary" : "outline"} className="text-[10px]">
            {activeStaffDevices > 0 ? "Web Push Live" : "No devices active"}
          </Badge>
        </div>

        {/* Quick Templates */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Duty Presets
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESET_TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  className="flex flex-col items-start rounded-xl border border-border bg-card p-2.5 text-left text-xs transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-1.5 text-primary font-medium">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tmpl.name}</span>
                  </div>
                  <span className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                    {tmpl.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Recipient */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Target Audience</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTarget("all_nurses")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                target === "all_nurses"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> All Nurses
            </button>
            <button
              type="button"
              onClick={() => setTarget("employee")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                target === "employee"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" /> Specific Nurse
            </button>
            <button
              type="button"
              onClick={() => setTarget("all_admins")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                target === "all_admins"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Radio className="h-3.5 w-3.5" /> Office Admins
            </button>
          </div>
        </div>

        {/* Specific Nurse Selector */}
        {target === "employee" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Nurse</Label>
            {initialEmployeeName && !employeeId ? (
              <p className="text-xs text-muted-foreground">
                Targeting: <span className="font-semibold text-foreground">{initialEmployeeName}</span>
              </p>
            ) : null}
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a nurse from the roster..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code}) — {emp.designation || emp.category || "Staff"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Title and Message */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notification Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🚨 New Patient Duty Assigned"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Message Body</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Enter instructions, patient location, or duty notes..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority & Vibration</Label>
              <Select
                value={urgency}
                onValueChange={(v) => setUrgency(v as "normal" | "high")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    🔴 High (Urgent Alert Chime & Heavy Vibration)
                  </SelectItem>
                  <SelectItem value="normal">
                    🔵 Normal (Standard Notification)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deep Link / Action URL</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/staff/status"
              />
            </div>
          </div>
        </div>

        {/* Smartphone Lockscreen Preview */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            <span>Nurse Phone Screen Preview</span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-neutral-950 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
              <div className="flex items-center gap-1.5">
                <img
                  src="/favicon.svg"
                  alt="SSN"
                  className="h-3.5 w-3.5 rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="font-semibold text-neutral-200">SHRI KRISHNA NURSING</span>
              </div>
              <span>now</span>
            </div>

            <p className="text-xs font-bold text-white">{title || "Duty Alert Title"}</p>
            <p className="mt-0.5 text-xs text-neutral-300 leading-relaxed">
              {message || "Duty alert message..."}
            </p>

            <div className="mt-3 flex items-center gap-2 border-t border-neutral-800/80 pt-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-0.5 font-medium text-cyan-300 border border-cyan-500/30">
                View Duty 📋
              </span>
              <span className="text-neutral-500">Dismiss</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={dispatchMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={dispatchMutation.isPending}
            className="brand-gradient font-medium text-white shadow-md hover:brightness-110 gap-1.5"
          >
            {dispatchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Web Push
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
