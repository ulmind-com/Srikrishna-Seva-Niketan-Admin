import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Helmet } from "react-helmet-async";
import {
  Save,
  Plus,
  Trash2,
  Layers,
  Type,
  BarChart3,
  Smartphone,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import type { Category, ImageAsset, HeroStat } from "@/types/models";
import { resourceServices } from "@/services/resources";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/common/ImageUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ─────── Types ────── */

type CategoryHeroFormValues = {
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  hero_cta_primary_text: string;
  hero_cta_secondary_text: string;
  hero_images: ImageAsset[];
  hero_images_mobile: ImageAsset[];
  hero_stats: HeroStat[];
};

const DEFAULT_FORM: CategoryHeroFormValues = {
  hero_badge: "",
  hero_title: "",
  hero_description: "",
  hero_cta_primary_text: "",
  hero_cta_secondary_text: "",
  hero_images: [],
  hero_images_mobile: [],
  hero_stats: [],
};

/* ─────── Page ────── */

export function CategoryHeroesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings:update");

  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ["categories", "hero-page"],
    queryFn: () => resourceServices.serviceCategories.list({ page_size: 100, sort_by: "order" }),
  });
  const categories = catData?.items ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first category
  useEffect(() => {
    if (!selectedId && categories.length > 0) {
      setSelectedId(categories[0].id);
    }
  }, [categories, selectedId]);

  const selectedCategory = categories.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Category Heroes · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Category Heroes"
        description="Manage the hero banner for each service category page — images, text, buttons and stats."
        icon={<Layers />}
      />

      {catsLoading ? (
        <Skeleton className="h-[600px] rounded-xl" />
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No categories found. Create categories first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Category Selector */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-semibold whitespace-nowrap">Select Category:</Label>
                <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Choose a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Hero Form for Selected Category */}
          {selectedCategory && (
            <CategoryHeroForm
              key={selectedCategory.id}
              category={selectedCategory}
              canEdit={canEdit}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─────── Form ────── */

function CategoryHeroForm({ category, canEdit }: { category: Category; canEdit: boolean }) {
  const qc = useQueryClient();

  const { register, handleSubmit, reset, control } = useForm<CategoryHeroFormValues>({
    defaultValues: DEFAULT_FORM,
  });

  const desktopImagesField = useFieldArray({ control, name: "hero_images" });
  const mobileImagesField = useFieldArray({ control, name: "hero_images_mobile" });
  const statsField = useFieldArray({ control, name: "hero_stats" });

  // Populate form when category changes
  useEffect(() => {
    reset({
      hero_badge: category.hero_badge ?? "",
      hero_title: category.hero_title ?? "",
      hero_description: category.hero_description ?? "",
      hero_cta_primary_text: category.hero_cta_primary_text ?? "",
      hero_cta_secondary_text: category.hero_cta_secondary_text ?? "",
      hero_images: category.hero_images ?? [],
      hero_images_mobile: category.hero_images_mobile ?? [],
      hero_stats: category.hero_stats ?? [],
    });
  }, [category, reset]);

  const mutation = useMutation({
    mutationFn: (values: CategoryHeroFormValues) =>
      resourceServices.serviceCategories.update(category.id, {
        hero_badge: values.hero_badge || null,
        hero_title: values.hero_title || null,
        hero_description: values.hero_description || null,
        hero_cta_primary_text: values.hero_cta_primary_text || null,
        hero_cta_secondary_text: values.hero_cta_secondary_text || null,
        hero_images: values.hero_images,
        hero_images_mobile: values.hero_images_mobile,
        hero_stats: values.hero_stats,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Hero updated for "${category.name}"`);
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                  <Type className="h-4 w-4 text-primary" />
                </div>
                {category.name} — Hero Section
              </CardTitle>
              <CardDescription className="mt-1">
                Manage the hero banner shown at the top of the <strong>{category.name}</strong> page on the website.
              </CardDescription>
            </div>
            {canEdit && (
              <Button type="submit" disabled={mutation.isPending} className="shrink-0">
                <Save className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Saving…" : "Save Hero"}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* ── Hero Text ── */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-base">Hero Text</h3>
            </div>

            <Field label="Eyebrow Badge">
              <Input
                placeholder="e.g. Skilled Nursing Care at Home"
                {...register("hero_badge")}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground mt-1">The small text badge shown above the hero title.</p>
            </Field>
            <Field label="Hero Title">
              <Input
                placeholder="e.g. Professional Nursing Support Delivered at Home"
                {...register("hero_title")}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Hero Description">
              <Textarea
                rows={3}
                placeholder="Describe what this category offers..."
                {...register("hero_description")}
                disabled={!canEdit}
              />
            </Field>
          </div>

          <div className="h-px bg-border" />

          {/* ── CTA Buttons ── */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">CTA Buttons</h3>
            <p className="text-sm text-muted-foreground">Customise the text on the hero call-to-action buttons.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Primary Button Text">
                <Input
                  placeholder="e.g. Book a Nurse"
                  {...register("hero_cta_primary_text")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Secondary Button Text">
                <Input
                  placeholder="e.g. Call Now"
                  {...register("hero_cta_secondary_text")}
                  disabled={!canEdit}
                />
              </Field>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* ── Desktop Slider Images (16:9) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-base font-semibold">Desktop Slider Images (16:9)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Shown on desktops and tablets. Use landscape/wide images.</p>
                </div>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => desktopImagesField.append({ url: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Image
                </Button>
              )}
            </div>
            {desktopImagesField.fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                No desktop images uploaded. Default images will be used.
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {desktopImagesField.fields.map((f, i) => (
                <div key={f.id} className="relative group">
                  <Controller
                    control={control}
                    name={`hero_images.${i}`}
                    render={({ field }) => (
                      <ImageUpload
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        folder="nupun/categories/hero"
                        aspect="wide"
                      />
                    )}
                  />
                  {canEdit && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => desktopImagesField.remove(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* ── Mobile Slider Images (9:16) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-base font-semibold">Mobile Slider Images (9:16)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Shown on mobile phones. Use portrait/vertical images.</p>
                </div>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => mobileImagesField.append({ url: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Mobile Image
                </Button>
              )}
            </div>
            {mobileImagesField.fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                No mobile images uploaded. Desktop images will be used as fallback.
              </p>
            )}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mobileImagesField.fields.map((f, i) => (
                <div key={f.id} className="relative group">
                  <Controller
                    control={control}
                    name={`hero_images_mobile.${i}`}
                    render={({ field }) => (
                      <ImageUpload
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        folder="nupun/categories/hero/mobile"
                        aspect="portrait"
                      />
                    )}
                  />
                  {canEdit && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => mobileImagesField.remove(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* ── Hero Stats ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-base">Hero Stats</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Stats displayed at the bottom of the hero (e.g. "250+" Caregivers).</p>
                </div>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => statsField.append({ value: "", label: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Stat
                </Button>
              )}
            </div>
            {statsField.fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                No stats added yet. Default stats will be shown on the website.
              </p>
            )}
            <div className="space-y-3">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {statsField.fields.map((f, i) => {
                  const currentLabel = statsField.fields[i]?.label;
                  return (
                    <AccordionItem key={f.id} value={`stat-${f.id}`} className="border rounded-lg bg-muted/10 px-4">
                      <div className="flex items-center justify-between w-full group">
                        <AccordionTrigger className="hover:no-underline flex-1 py-4 text-sm font-semibold">
                          Stat {i + 1} {currentLabel ? `— ${currentLabel}` : ""}
                        </AccordionTrigger>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 z-10"
                            onClick={(e) => {
                              e.preventDefault();
                              statsField.remove(i);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <AccordionContent className="pb-4">
                        <div className="flex flex-wrap items-end gap-3 pt-2">
                          <div className="w-32 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Value</Label>
                            <Input placeholder="250+" {...register(`hero_stats.${i}.value` as const)} disabled={!canEdit} />
                          </div>
                          <div className="flex-1 space-y-1.5 min-w-[200px]">
                            <Label className="text-xs text-muted-foreground">Label</Label>
                            <Input placeholder="Caregivers" {...register(`hero_stats.${i}.label` as const)} disabled={!canEdit} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>

          {/* ── Save Button at Bottom ── */}
          {canEdit && (
            <div className="pt-4 border-t flex justify-end">
              <Button type="submit" disabled={mutation.isPending} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Saving…" : `Save ${category.name} Hero`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}

/* ─────── Helpers ────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
