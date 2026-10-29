import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AsyncSelect } from "@/components/common/AsyncSelect";
import { CustomerField } from "@/components/common/CustomerField";
import { LocationPinField } from "@/components/resource/fields/LocationPinField";
import { ImageUpload } from "@/components/common/ImageUpload";
import { VideoUpload } from "@/components/common/VideoUpload";
import { TagsInput } from "@/components/common/TagsInput";
import { cn } from "@/lib/utils";
import type { FieldConfig, ImageAsset } from "./form-helpers";
import { buildDefaults, groupSections } from "./form-helpers";
import type { FileAsset, ImageAsset as ImageAssetModel } from "@/types/models";

interface ResourceFormProps<T> {
  fields: FieldConfig[];
  initial?: Partial<T> | null;
  submitting?: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function ResourceForm<T>({
  fields,
  initial,
  submitting,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: ResourceFormProps<T>) {
  const defaultValues = useMemo(
    () => buildDefaults(fields, initial ?? undefined),
    [fields, initial]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Record<string, unknown>>({ defaultValues });

  const sections = useMemo(() => groupSections(fields), [fields]);

  // Load API-backed select options (e.g. branch pickers) once per form.
  const dynamicFields = useMemo(
    () => fields.filter((f) => f.dynamicOptions),
    [fields]
  );
  const dynamicQueries = useQueries({
    queries: dynamicFields.map((f) => ({
      queryKey: ["field-options", f.dynamicOptions!.queryKey],
      queryFn: () => f.dynamicOptions!.fetch(),
      staleTime: 60_000,
    })),
  });
  // Carry the whole query state, not just the rows: a dynamic picker has to be
  // able to say "loading", "failed" or "nothing here yet" instead of opening an
  // empty list that looks broken.
  const dynamicStateMap = useMemo(() => {
    const map: Record<string, DynamicFieldState> = {};
    dynamicFields.forEach((f, i) => {
      const q = dynamicQueries[i];
      map[f.name] = {
        options: q?.data ?? [],
        isLoading: Boolean(q?.isLoading),
        isError: Boolean(q?.isError),
        refetch: () => void q?.refetch(),
      };
    });
    return map;
  }, [dynamicFields, dynamicQueries]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            {section.title !== "__default__" && (
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </h4>
            )}
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              {section.fields.map((field) => {
                const error = getError(errors, field.name);
                return (
                  <div
                    key={field.name}
                    className={cn(
                      "space-y-1.5",
                      field.colSpan === 2 || field.type === "image" || field.type === "video"
                        ? "sm:col-span-2"
                        : field.type === "textarea" ||
                            field.type === "richtext" ||
                            field.type === "tags"
                          ? "sm:col-span-2"
                          : ""
                    )}
                  >
                    {field.type !== "switch" && (
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && (
                          <span className="ml-0.5 text-destructive">*</span>
                        )}
                      </Label>
                    )}

                    {renderControl(field, register, control, dynamicStateMap[field.name])}

                    {field.helper && !error && (
                      <p className="text-xs text-muted-foreground">
                        {field.helper}
                      </p>
                    )}
                    {error && (
                      <p className="text-xs font-medium text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Live state of one API-backed option list. */
interface DynamicFieldState {
  options: { label: string; value: string }[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderControl(
  field: FieldConfig,
  register: any,
  control: any,
  dynamicState?: DynamicFieldState
) {
  switch (field.type) {
    case "textarea":
    case "richtext":
      return (
        <Textarea
          id={field.name}
          placeholder={field.placeholder}
          rows={field.type === "richtext" ? 8 : 4}
          {...register(field.name, { required: field.required })}
        />
      );

    case "switch":
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium">{field.label}</span>
              <Switch checked={Boolean(f.value)} onCheckedChange={f.onChange} />
            </label>
          )}
        />
      );

    case "customer":
      return (
        <Controller
          control={control}
          name={field.name}
          rules={{ required: field.required }}
          render={({ field: f }) => (
            <CustomerField
              id={field.name}
              value={f.value ? String(f.value) : undefined}
              onChange={f.onChange}
              control={control}
            />
          )}
        />
      );

    case "geopoint":
      return (
        <LocationPinField
          control={control}
          latName={field.latField ?? "lat"}
          lngName={field.lngField ?? "lng"}
        />
      );

    case "select":
      // API-backed lists get the searchable picker, which can also report
      // loading / failure / emptiness. Static option lists stay a plain select.
      if (!field.options && dynamicState) {
        return (
          <Controller
            control={control}
            name={field.name}
            rules={{ required: field.required }}
            render={({ field: f }) => (
              <AsyncSelect
                id={field.name}
                value={f.value ? String(f.value) : undefined}
                onChange={f.onChange}
                options={dynamicState.options}
                isLoading={dynamicState.isLoading}
                isError={dynamicState.isError}
                onRetry={dynamicState.refetch}
                placeholder={field.placeholder ?? "Select…"}
                emptyMessage={
                  field.emptyMessage ?? "Nothing to choose from yet."
                }
              />
            )}
          />
        );
      }
      return (
        <Controller
          control={control}
          name={field.name}
          rules={{ required: field.required }}
          render={({ field: f }) => (
            <Select
              value={f.value ? String(f.value) : undefined}
              onValueChange={f.onChange}
            >
              <SelectTrigger id={field.name}>
                <SelectValue placeholder={field.placeholder ?? "Select…"} />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      );

    case "image":
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <ImageUpload
              value={f.value as ImageAssetModel | null}
              onChange={(asset: ImageAsset | null) => f.onChange(asset)}
              folder={field.folder}
            />
          )}
        />
      );

    case "video":
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <VideoUpload
              value={f.value as FileAsset | null}
              onChange={(asset: FileAsset | null) => f.onChange(asset)}
              folder={field.folder}
            />
          )}
        />
      );

    case "tags":
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <TagsInput
              value={(f.value as string[]) ?? []}
              onChange={f.onChange}
              placeholder={field.placeholder}
            />
          )}
        />
      );

    case "number":
      return (
        <Input
          id={field.name}
          type="number"
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          {...register(field.name, {
            required: field.required,
            valueAsNumber: true,
          })}
        />
      );

    case "date":
      return (
        <Input
          id={field.name}
          type="date"
          {...register(field.name, { required: field.required })}
        />
      );

    default:
      return (
        <Input
          id={field.name}
          type={field.type === "email" ? "email" : "text"}
          placeholder={field.placeholder}
          {...register(field.name, { required: field.required })}
        />
      );
  }
}

function getError(errors: any, name: string): string | undefined {
  const parts = name.split(".");
  let cur = errors;
  for (const p of parts) {
    cur = cur?.[p];
    if (!cur) return undefined;
  }
  if (cur?.message) return String(cur.message);
  if (cur?.type === "required") return "This field is required";
  return undefined;
}
