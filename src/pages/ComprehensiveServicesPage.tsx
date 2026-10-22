import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/common/ImageUpload";
import { settingsService } from "@/services/settings.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { WebsiteSettings, ComprehensiveServiceCard } from "@/types/models";

/* ---------- Tag Input component for features / form_options ---------- */

function TagInput({
  value = [],
  onChange,
  placeholder = "Type and press Enter",
  disabled = false,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
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
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={disabled || !input.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Service Card Editor ---------- */

function ServiceCardEditor({
  index,
  control,
  register,
  remove,
  canEdit,
  moveUp,
  moveDown,
  isFirst,
  isLast,
}: {
  index: number;
  control: any;
  register: any;
  remove: () => void;
  canEdit: boolean;
  moveUp: () => void;
  moveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <Controller
            control={control}
            name={`comprehensive_services.${index}.title`}
            render={({ field }) => (
              <span className="font-semibold text-sm truncate block">
                {field.value || `Service Card ${index + 1}`}
              </span>
            )}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canEdit && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); moveUp(); }}
                disabled={isFirst}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); moveDown(); }}
                disabled={isLast}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable Body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t">
          <div className="grid gap-5 md:grid-cols-[200px_1fr] pt-5">
            {/* Image */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Card Image</Label>
              <Controller
                control={control}
                name={`comprehensive_services.${index}.image`}
                render={({ field }) => (
                  <ImageUpload
                    value={
                      field.value
                        ? typeof field.value === "string"
                          ? { url: field.value, public_id: "" }
                          : field.value
                        : undefined
                    }
                    onChange={field.onChange}
                    folder="nupun/comprehensive-services"
                    aspect="video"
                  />
                )}
              />
            </div>

            {/* Text fields */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Card Title</Label>
                  <Input
                    {...register(`comprehensive_services.${index}.title`)}
                    placeholder="Home Nursing Care"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Card ID (slug)</Label>
                  <Input
                    {...register(`comprehensive_services.${index}.id`)}
                    placeholder="nursing"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Button Text</Label>
                  <Input
                    {...register(`comprehensive_services.${index}.button_text`)}
                    placeholder="Book Nursing Care"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Button Link (optional)</Label>
                  <Input
                    {...register(`comprehensive_services.${index}.button_link`)}
                    placeholder="/nursing-care"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Form Dropdown Label</Label>
                  <Input
                    {...register(`comprehensive_services.${index}.select_label`)}
                    placeholder="Select nursing service"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Display Order</Label>
                  <Input
                    type="number"
                    {...register(`comprehensive_services.${index}.order`, { valueAsNumber: true })}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2 pt-3 border-t">
            <Label className="text-sm font-medium">Features (bullet points on card)</Label>
            <p className="text-xs text-muted-foreground">These appear as checkmark items on the service card.</p>
            <Controller
              control={control}
              name={`comprehensive_services.${index}.features`}
              render={({ field }) => (
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="Type a feature and press Enter"
                  disabled={!canEdit}
                />
              )}
            />
          </div>

          {/* Form Options */}
          <div className="space-y-2 pt-3 border-t">
            <Label className="text-sm font-medium">Booking Form Options</Label>
            <p className="text-xs text-muted-foreground">Options shown in the booking form dropdown when user clicks the CTA button.</p>
            <Controller
              control={control}
              name={`comprehensive_services.${index}.form_options`}
              render={({ field }) => (
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="Type an option and press Enter"
                  disabled={!canEdit}
                />
              )}
            />
          </div>

          {/* Delete */}
          {canEdit && (
            <div className="pt-3 border-t flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={remove}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Remove Card
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Main Page ---------- */

type FormValues = {
  comprehensive_services_eyebrow: string;
  comprehensive_services_title: string;
  comprehensive_services_description: string;
  comprehensive_services: ComprehensiveServiceCard[];
};

export function ComprehensiveServicesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings:update");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { register, handleSubmit, reset, control } = useForm<FormValues>({
    defaultValues: {
      comprehensive_services_eyebrow: "",
      comprehensive_services_title: "",
      comprehensive_services_description: "",
      comprehensive_services: [],
    },
  });

  const servicesField = useFieldArray({
    control,
    name: "comprehensive_services",
  });

  useEffect(() => {
    if (data) {
      reset({
        comprehensive_services_eyebrow: data.comprehensive_services_eyebrow ?? "",
        comprehensive_services_title: data.comprehensive_services_title ?? "",
        comprehensive_services_description: data.comprehensive_services_description ?? "",
        comprehensive_services: data.comprehensive_services ?? [],
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) =>
      settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Comprehensive Services saved!");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const onSubmit = (v: FormValues) => {
    mutation.mutate({
      comprehensive_services_eyebrow: v.comprehensive_services_eyebrow,
      comprehensive_services_title: v.comprehensive_services_title,
      comprehensive_services_description: v.comprehensive_services_description,
      comprehensive_services: v.comprehensive_services,
    });
  };

  const addNewCard = () => {
    servicesField.append({
      id: "",
      title: "",
      image: null,
      features: [],
      button_text: "",
      button_link: "",
      select_label: "",
      form_options: [],
      order: servicesField.fields.length,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl brand-gradient text-primary-foreground shadow-glow">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Comprehensive Services</h1>
            <p className="text-sm text-muted-foreground">
              Manage the "Our Comprehensive Services" section on the homepage
            </p>
          </div>
        </div>
        {canEdit && (
          <Button type="submit" loading={mutation.isPending}>
            <Save className="h-4 w-4" /> Save All Changes
          </Button>
        )}
      </div>

      {/* Section Header Config */}
      <Card>
        <CardHeader>
          <CardTitle>Section Header</CardTitle>
          <CardDescription>
            The badge text, title and description shown above the service cards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Eyebrow Badge</Label>
            <Input
              {...register("comprehensive_services_eyebrow")}
              placeholder="What We Provide"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Section Title</Label>
            <Input
              {...register("comprehensive_services_title")}
              placeholder="Our Comprehensive Services"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Section Description</Label>
            <Textarea
              {...register("comprehensive_services_description")}
              rows={3}
              placeholder="Seven specialized care verticals designed around your family's needs..."
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Cards</CardTitle>
              <CardDescription>
                Each card represents a service category with image, features list and booking form options.
              </CardDescription>
            </div>
            {canEdit && (
              <Button type="button" variant="outline" onClick={addNewCard}>
                <Plus className="h-4 w-4" /> Add Service Card
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {servicesField.fields.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No service cards yet. Click "Add Service Card" to create one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {servicesField.fields.map((field, index) => (
                <ServiceCardEditor
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  remove={() => servicesField.remove(index)}
                  canEdit={canEdit}
                  moveUp={() => {
                    if (index > 0) servicesField.swap(index, index - 1);
                  }}
                  moveDown={() => {
                    if (index < servicesField.fields.length - 1)
                      servicesField.swap(index, index + 1);
                  }}
                  isFirst={index === 0}
                  isLast={index === servicesField.fields.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom save */}
      {canEdit && servicesField.fields.length > 0 && (
        <div className="flex justify-end">
          <Button type="submit" loading={mutation.isPending} size="lg">
            <Save className="h-4 w-4" /> Save All Changes
          </Button>
        </div>
      )}
    </form>
  );
}

