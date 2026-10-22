import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  ClipboardList,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { settingsService } from "@/services/settings.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { BookingFormConfig, BookingFormStep, BookingFormField } from "@/types/models";

/* ──────────── Default config (mirrors the current hardcoded form) ──────────── */

const DEFAULT_CONFIG: BookingFormConfig = {
  steps: [
    {
      key: "service",
      label: "Service",
      eyebrow: "Service",
      title: "Which service do you need?",
      description: "Select the type of care you're looking for.",
      order: 0,
      fields: [
        { name: "service_name", label: "Service", type: "radio", placeholder: null, required: true, options: [], col_span: 2, order: 0 },
      ],
    },
    {
      key: "schedule",
      label: "Location & Schedule",
      eyebrow: "Location & Schedule",
      title: "Where and when do you need care?",
      description: "Pick your preferred city, date and time — final slot is confirmed on the call.",
      order: 1,
      fields: [
        { name: "city", label: "Select City", type: "select", placeholder: "Select city", required: true, options: [], col_span: 2, order: 0 },
        { name: "preferred_date", label: "Preferred Date", type: "date", placeholder: null, required: true, options: [], col_span: 1, order: 1 },
        { name: "preferred_time", label: "Preferred Time", type: "time", placeholder: null, required: false, options: [], col_span: 1, order: 2 },
      ],
    },
    {
      key: "patient",
      label: "Patient Details",
      eyebrow: "Patient Details",
      title: "Tell us about the patient and care required",
      description: null,
      order: 2,
      fields: [
        { name: "patient_name", label: "Patient Name", type: "text", placeholder: "Full name", required: true, options: [], col_span: 2, order: 0 },
        { name: "patient_age", label: "Age", type: "number", placeholder: "e.g. 68", required: false, options: [], col_span: 1, order: 1 },
        { name: "patient_gender", label: "Gender", type: "select", placeholder: "Select", required: false, options: ["Male", "Female", "Other"], col_span: 1, order: 2 },
        { name: "care_required", label: "Service / Care Required", type: "textarea", placeholder: "What specific care/service do you require?", required: false, options: [], col_span: 2, order: 3 },
        { name: "message", label: "Additional Information / Special Requirements", type: "textarea", placeholder: "Any other details — medical conditions, preferences, timings…", required: false, options: [], col_span: 2, order: 4 },
      ],
    },
    {
      key: "contact",
      label: "Contact & Address",
      eyebrow: "Contact & Address",
      title: "How can we reach you?",
      description: null,
      order: 3,
      fields: [
        { name: "contact_phone", label: "Phone Number *", type: "text", placeholder: "+91 98765 43210", required: true, options: [], col_span: 1, order: 0 },
        { name: "whatsapp_number", label: "WhatsApp Number (Optional)", type: "text", placeholder: "+91 98765 43210", required: false, options: [], col_span: 1, order: 1 },
        { name: "contact_email", label: "Email (Optional)", type: "text", placeholder: "you@example.com", required: false, options: [], col_span: 2, order: 2 },
        { name: "address", label: "Full Address *", type: "textarea", placeholder: "House / street / area", required: true, options: [], col_span: 2, order: 3 },
        { name: "pincode", label: "Pincode", type: "text", placeholder: "e.g. 121001", required: false, options: [], col_span: 1, order: 4 },
      ],
    },
  ],
  cities: ["Faridabad", "Gurugram", "Noida", "Delhi", "Other"],
  service_care_hints: {
    "Home Sample Collection": "What test/sample collection is required?",
    "ICU Setup": "What ICU setup and equipment are needed?",
    "Medical Equipment Rental": "Which equipment is required and for how long?",
    "Physiotherapy & Recovery": "What type of physiotherapy is required?",
    "Mother & Baby Care": "What type of mother/baby care is needed?",
    "Elderly Care": "What type of elderly care is required?",
    "Home Nursing Care": "What type of nursing care is required?",
  },
};

/* ──────────── Tag Input (reused from Comprehensive Services) ──────────── */

function TagInput({
  value = [],
  onChange,
  placeholder = "Type and press Enter",
}: {
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag}
              <button type="button" onClick={() => remove(i)} className="hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────── Field Editor ──────────── */

function FieldEditor({
  field,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: BookingFormField;
  index: number;
  onUpdate: (idx: number, updated: BookingFormField) => void;
  onRemove: (idx: number) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="group rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3 relative hover:border-border transition-colors">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Field Name (key)</Label>
            <Input
              value={field.name}
              onChange={(e) => onUpdate(index, { ...field, name: e.target.value })}
              className="h-8 text-xs"
              placeholder="e.g. patient_name"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Label</Label>
            <Input
              value={field.label}
              onChange={(e) => onUpdate(index, { ...field, label: e.target.value })}
              className="h-8 text-xs"
              placeholder="e.g. Patient Name"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</Label>
            <select
              value={field.type}
              onChange={(e) => onUpdate(index, { ...field, type: e.target.value as BookingFormField["type"] })}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="text">Text</option>
              <option value="textarea">Textarea</option>
              <option value="select">Select</option>
              <option value="radio">Radio</option>
              <option value="date">Date</option>
              <option value="time">Time</option>
              <option value="number">Number</option>
            </select>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pl-6">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Placeholder</Label>
          <Input
            value={field.placeholder || ""}
            onChange={(e) => onUpdate(index, { ...field, placeholder: e.target.value || null })}
            className="h-8 text-xs"
            placeholder="Placeholder text"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Width</Label>
          <select
            value={field.col_span}
            onChange={(e) => onUpdate(index, { ...field, col_span: Number(e.target.value) })}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value={1}>Half</option>
            <option value={2}>Full</option>
          </select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate(index, { ...field, required: e.target.checked })}
              className="rounded"
            />
            Required
          </label>
        </div>
        <div className="flex items-end justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onMoveUp(index)} disabled={isFirst} className="h-7 w-7 p-0">
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onMoveDown(index)} disabled={isLast} className="h-7 w-7 p-0">
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Options (for select/radio) */}
      {(field.type === "select" || field.type === "radio") && (
        <div className="pl-6">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Options</Label>
          <TagInput
            value={field.options}
            onChange={(opts) => onUpdate(index, { ...field, options: opts })}
            placeholder="Add option and press Enter"
          />
        </div>
      )}
    </div>
  );
}

/* ──────────── Step Card ──────────── */

function StepCard({
  step,
  stepIndex,
  onUpdateStep,
  onRemoveStep,
  onMoveStepUp,
  onMoveStepDown,
  isFirst,
  isLast,
}: {
  step: BookingFormStep;
  stepIndex: number;
  onUpdateStep: (idx: number, updated: BookingFormStep) => void;
  onRemoveStep: (idx: number) => void;
  onMoveStepUp: (idx: number) => void;
  onMoveStepDown: (idx: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const updateField = (fieldIdx: number, updated: BookingFormField) => {
    const newFields = [...step.fields];
    newFields[fieldIdx] = updated;
    onUpdateStep(stepIndex, { ...step, fields: newFields });
  };

  const removeField = (fieldIdx: number) => {
    const newFields = step.fields.filter((_, i) => i !== fieldIdx);
    onUpdateStep(stepIndex, { ...step, fields: newFields });
  };

  const moveFieldUp = (fieldIdx: number) => {
    if (fieldIdx === 0) return;
    const newFields = [...step.fields];
    [newFields[fieldIdx - 1], newFields[fieldIdx]] = [newFields[fieldIdx], newFields[fieldIdx - 1]];
    onUpdateStep(stepIndex, { ...step, fields: newFields });
  };

  const moveFieldDown = (fieldIdx: number) => {
    if (fieldIdx >= step.fields.length - 1) return;
    const newFields = [...step.fields];
    [newFields[fieldIdx], newFields[fieldIdx + 1]] = [newFields[fieldIdx + 1], newFields[fieldIdx]];
    onUpdateStep(stepIndex, { ...step, fields: newFields });
  };

  const addField = () => {
    const newField: BookingFormField = {
      name: `field_${Date.now()}`,
      label: "New Field",
      type: "text",
      placeholder: null,
      required: false,
      options: [],
      col_span: 2,
      order: step.fields.length,
    };
    onUpdateStep(stepIndex, { ...step, fields: [...step.fields, newField] });
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-0.5 mt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onMoveStepUp(stepIndex)} disabled={isFirst} className="h-6 w-6 p-0">
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onMoveStepDown(stepIndex)} disabled={isLast} className="h-6 w-6 p-0">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {stepIndex + 1}
                </span>
                <div>
                  <CardTitle className="text-base">{step.label || "Untitled Step"}</CardTitle>
                  <CardDescription className="text-xs">
                    {step.fields.length} field{step.fields.length !== 1 ? "s" : ""} · key: {step.key}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs"
                >
                  {expanded ? "Collapse" : "Expand"}
                  {expanded ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveStep(stepIndex)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {expanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Step Key</Label>
                  <Input
                    value={step.key}
                    onChange={(e) => onUpdateStep(stepIndex, { ...step, key: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="e.g. service"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Step Label</Label>
                  <Input
                    value={step.label}
                    onChange={(e) => onUpdateStep(stepIndex, { ...step, label: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="e.g. Service"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Eyebrow</Label>
                  <Input
                    value={step.eyebrow || ""}
                    onChange={(e) => onUpdateStep(stepIndex, { ...step, eyebrow: e.target.value || null })}
                    className="h-8 text-sm"
                    placeholder="e.g. SERVICE"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</Label>
                  <Input
                    value={step.title || ""}
                    onChange={(e) => onUpdateStep(stepIndex, { ...step, title: e.target.value || null })}
                    className="h-8 text-sm"
                    placeholder="Step title"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Input
                    value={step.description || ""}
                    onChange={(e) => onUpdateStep(stepIndex, { ...step, description: e.target.value || null })}
                    className="h-8 text-sm"
                    placeholder="Optional description"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fields</h4>
            <Button type="button" variant="outline" size="sm" onClick={addField} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Add Field
            </Button>
          </div>

          <div className="space-y-2">
            {step.fields.map((field, fieldIdx) => (
              <FieldEditor
                key={fieldIdx}
                field={field}
                index={fieldIdx}
                onUpdate={updateField}
                onRemove={removeField}
                onMoveUp={moveFieldUp}
                onMoveDown={moveFieldDown}
                isFirst={fieldIdx === 0}
                isLast={fieldIdx === step.fields.length - 1}
              />
            ))}

            {step.fields.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm rounded-lg border border-dashed">
                No fields yet. Click "Add Field" to add one.
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ──────────── Service Care Hints Editor ──────────── */

function HintsEditor({
  hints,
  onChange,
}: {
  hints: Record<string, string>;
  onChange: (hints: Record<string, string>) => void;
}) {
  const entries = Object.entries(hints);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const addHint = () => {
    const k = newKey.trim();
    const v = newValue.trim();
    if (k && v) {
      onChange({ ...hints, [k]: v });
      setNewKey("");
      setNewValue("");
    }
  };

  const removeHint = (key: string) => {
    const updated = { ...hints };
    delete updated[key];
    onChange(updated);
  };

  const updateHint = (oldKey: string, newVal: string) => {
    onChange({ ...hints, [oldKey]: newVal });
  };

  return (
    <div className="space-y-3">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-start gap-2">
          <div className="flex-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{key}</Label>
            <Input
              value={val}
              onChange={(e) => updateHint(key, e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeHint(key)}
            className="mt-5 h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <div className="flex items-end gap-2 pt-2 border-t border-border/50">
        <div className="flex-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Service Name</Label>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="h-8 text-xs"
            placeholder="e.g. Elderly Care"
          />
        </div>
        <div className="flex-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Hint Text</Label>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="h-8 text-xs"
            placeholder="e.g. What type of elderly care is required?"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHint}
          disabled={!newKey.trim() || !newValue.trim()}
          className="h-8"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ──────────── Main Page ──────────── */

export function BookingFormManagerPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = hasPermission("settings:update");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["website-settings"],
    queryFn: () => settingsService.getWebsite(),
  });

  const [config, setConfig] = useState<BookingFormConfig>(DEFAULT_CONFIG);
  const [dirty, setDirty] = useState(false);

  // Load config from settings
  useEffect(() => {
    if (settings?.booking_form_config) {
      setConfig(settings.booking_form_config);
    }
  }, [settings]);

  const update = (patch: Partial<BookingFormConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setDirty(true);
  };

  const saveMut = useMutation({
    mutationFn: () =>
      settingsService.updateWebsite({ booking_form_config: config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-settings"] });
      setDirty(false);
      toast.success("Booking form configuration saved!");
    },
    onError: (e) => toast.error(normalizeError(e).message),
  });

  // Step operations
  const updateStep = (idx: number, updated: BookingFormStep) => {
    const newSteps = [...config.steps];
    newSteps[idx] = updated;
    update({ steps: newSteps });
  };

  const removeStep = (idx: number) => {
    update({ steps: config.steps.filter((_, i) => i !== idx) });
  };

  const moveStepUp = (idx: number) => {
    if (idx === 0) return;
    const newSteps = [...config.steps];
    [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
    update({ steps: newSteps });
  };

  const moveStepDown = (idx: number) => {
    if (idx >= config.steps.length - 1) return;
    const newSteps = [...config.steps];
    [newSteps[idx], newSteps[idx + 1]] = [newSteps[idx + 1], newSteps[idx]];
    update({ steps: newSteps });
  };

  const addStep = () => {
    const newStep: BookingFormStep = {
      key: `step_${Date.now()}`,
      label: "New Step",
      eyebrow: "New Step",
      title: "Step Title",
      description: null,
      fields: [],
      order: config.steps.length,
    };
    update({ steps: [...config.steps, newStep] });
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    setDirty(true);
    toast.info("Reset to default configuration. Save to apply.");
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Booking Form Manager</h1>
            <p className="text-sm text-muted-foreground">
              Configure the multi-step booking form — steps, fields, cities and more.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            disabled={!canEdit}
            className="text-xs"
          >
            Reset to Default
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending || !canEdit}
            size="sm"
            className="gap-2"
          >
            {saveMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          You have unsaved changes.
        </div>
      )}

      {/* ── Steps ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Form Steps</h2>
          <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={!canEdit} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Step
          </Button>
        </div>

        {config.steps.map((step, idx) => (
          <StepCard
            key={step.key + idx}
            step={step}
            stepIndex={idx}
            onUpdateStep={updateStep}
            onRemoveStep={removeStep}
            onMoveStepUp={moveStepUp}
            onMoveStepDown={moveStepDown}
            isFirst={idx === 0}
            isLast={idx === config.steps.length - 1}
          />
        ))}

        {config.steps.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
            No steps configured. Click "Add Step" to get started.
          </div>
        )}
      </div>

      {/* ── Cities ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Cities</CardTitle>
          <CardDescription>Cities shown in the location/schedule step dropdown.</CardDescription>
        </CardHeader>
        <CardContent>
          <TagInput
            value={config.cities}
            onChange={(cities) => update({ cities })}
            placeholder="Add a city and press Enter"
          />
        </CardContent>
      </Card>

      {/* ── Service Care Hints ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Care Hints</CardTitle>
          <CardDescription>
            Per-service placeholder text for the "Care Required" field. When a user selects a service,
            this hint appears as the placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HintsEditor
            hints={config.service_care_hints}
            onChange={(service_care_hints) => update({ service_care_hints })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
