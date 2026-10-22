import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Helmet } from "react-helmet-async";
import {
  Save,
  Plus,
  Trash2,
  FileText,
  UserCircle,
  MapPin,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { WebsiteSettings, FounderCard, ImageAsset } from "@/types/models";
import { settingsService } from "@/services/settings.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/common/ImageUpload";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/* ─────── Types ────── */

type AboutPageFormValues = {
  about_hero_badge: string;
  about_hero_title: string;
  about_hero_description: string;
  about_hero_image: ImageAsset | null;
  about_founders: FounderCard[];
  about_address_name: string;
  about_address_line1: string;
  about_address_line2: string;
  about_map_embed_url: string;
};

const DEFAULT_FORM: AboutPageFormValues = {
  about_hero_badge: "",
  about_hero_title: "",
  about_hero_description: "",
  about_hero_image: null,
  about_founders: [],
  about_address_name: "",
  about_address_line1: "",
  about_address_line2: "",
  about_map_embed_url: "",
};

/* ─────── Page ────── */

export function AboutPageManager() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings:update");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { register, handleSubmit, reset, control } = useForm<AboutPageFormValues>({
    defaultValues: DEFAULT_FORM,
  });

  const foundersField = useFieldArray({ control, name: "about_founders" });

  useEffect(() => {
    if (data) {
      reset({
        about_hero_badge: data.about_hero_badge ?? "",
        about_hero_title: data.about_hero_title ?? "",
        about_hero_description: data.about_hero_description ?? "",
        about_hero_image: data.about_hero_image ?? null,
        about_founders: data.about_founders ?? [],
        about_address_name: data.about_address_name ?? "",
        about_address_line1: data.about_address_line1 ?? "",
        about_address_line2: data.about_address_line2 ?? "",
        about_map_embed_url: data.about_map_embed_url ?? "",
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) => settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("About page saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  if (isLoading) return <Skeleton className="h-[600px] rounded-xl" />;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>About Page · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="About Page"
        description="Manage the About page hero text, hero image, founder cards and office address."
        icon={<FileText />}
      />

      <form onSubmit={handleSubmit((v) => mutation.mutate({
        about_hero_badge: v.about_hero_badge || null,
        about_hero_title: v.about_hero_title || null,
        about_hero_description: v.about_hero_description || null,
        about_hero_image: v.about_hero_image,
        about_founders: v.about_founders,
        about_address_name: v.about_address_name || null,
        about_address_line1: v.about_address_line1 || null,
        about_address_line2: v.about_address_line2 || null,
        about_map_embed_url: v.about_map_embed_url || null,
      }))}>
        <div className="space-y-6">

          {/* ── Hero Section ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                      <ImageIcon className="h-4 w-4 text-primary" />
                    </div>
                    Hero Section
                  </CardTitle>
                  <CardDescription className="mt-1">
                    The hero banner at the top of the About page — "Care That Comes Home" section.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="Eyebrow Badge">
                <Input
                  placeholder="e.g. HOME PAGE – ABOUT NUPUN"
                  {...register("about_hero_badge")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Hero Title">
                <Input
                  placeholder="e.g. Care That Comes Home"
                  {...register("about_hero_title")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Hero Description">
                <Textarea
                  rows={4}
                  placeholder="Nupun Home Health Care Services provides reliable healthcare..."
                  {...register("about_hero_description")}
                  disabled={!canEdit}
                />
              </Field>
            </CardContent>
          </Card>

          {/* ── Founders Section ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                      <UserCircle className="h-4 w-4 text-primary" />
                    </div>
                    Our Founders
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Founder/Co-Founder cards displayed in the "Our Founders" section. Each card has a photo, name, role, description and optional address.
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      foundersField.append({
                        name: "",
                        role: "",
                        image: null,
                        description: "",
                        address: "",
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Founder
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {foundersField.fields.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                  No founder cards added yet. Click "Add Founder" to create one.
                </p>
              )}
              <Accordion type="single" collapsible className="w-full space-y-4">
                {foundersField.fields.map((f, i) => {
                  const currentName = foundersField.fields[i]?.name;
                  return (
                    <AccordionItem key={f.id} value={`founder-${f.id}`} className="relative border rounded-xl bg-muted/10 px-6">
                      <div className="flex items-center justify-between w-full group">
                        <AccordionTrigger className="hover:no-underline flex-1 py-5 font-semibold">
                          Founder {i + 1} {currentName ? `— ${currentName}` : ""}
                        </AccordionTrigger>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 z-10"
                            onClick={(e) => {
                              e.preventDefault();
                              foundersField.remove(i);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <AccordionContent className="pb-6">
                        <div className="flex flex-col md:flex-row gap-6 pt-2">
                          {/* Photo */}
                          <div className="shrink-0 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Photo</Label>
                            <div className="w-32 h-32">
                              <Controller
                                control={control}
                                name={`about_founders.${i}.image`}
                                render={({ field }) => (
                                  <ImageUpload
                                    value={field.value ?? undefined}
                                    onChange={field.onChange}
                                    folder="nupun/about/founders"
                                    aspect="square"
                                  />
                                )}
                              />
                            </div>
                          </div>

                          {/* Name & Role */}
                          <div className="flex-1 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field label="Name">
                                <Input
                                  placeholder="e.g. Sandeep Anand"
                                  {...register(`about_founders.${i}.name` as const)}
                                  disabled={!canEdit}
                                />
                              </Field>
                              <Field label="Role / Title">
                                <Input
                                  placeholder="e.g. Founder, Nupun Home Health Care"
                                  {...register(`about_founders.${i}.role` as const)}
                                  disabled={!canEdit}
                                />
                              </Field>
                            </div>
                            <Field label="Description">
                              <Textarea
                                rows={4}
                                placeholder="Background, experience and vision..."
                                {...register(`about_founders.${i}.description` as const)}
                                disabled={!canEdit}
                              />
                            </Field>
                            <Field label="Address (optional — shows on map)">
                              <Input
                                placeholder="e.g. 5th Floor, Tower-C, Unitech Cyber Park, Gurgaon"
                                {...register(`about_founders.${i}.address` as const)}
                                disabled={!canEdit}
                              />
                            </Field>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          {/* ── Address Section ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                Our Address
              </CardTitle>
              <CardDescription>
                The office address shown at the bottom of the About page with the Google Maps embed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="Company Name">
                <Input
                  placeholder="Nupun Home Health Care"
                  {...register("about_address_name")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Address Line 1">
                <Input
                  placeholder="5th Floor, Tower-C, Unitech Cyber Park"
                  {...register("about_address_line1")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Address Line 2">
                <Input
                  placeholder="Sector-39, Gurgaon, India – 122003"
                  {...register("about_address_line2")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Google Maps Embed URL">
                <Textarea
                  rows={3}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  {...register("about_map_embed_url")}
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the full Google Maps embed URL (from Share → Embed a map → copy the src URL).
                </p>
              </Field>
            </CardContent>
          </Card>

          {/* ── Save Button ── */}
          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Saving…" : "Save About Page"}
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
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
