import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Helmet } from "react-helmet-async";
import {
  Settings as SettingsIcon,
  Globe,
  Share2,
  MessageCircle,
  Facebook,
  Instagram,
  Youtube,
  Save,
  MoveUp,
  MoveDown,
  Plus,
  Trash2,
  LayoutTemplate,
  Layers,
  Scale,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import type { ServicesHero, SocialLinks, WebsiteSettings } from "@/types/models";
import { settingsService } from "@/services/settings.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/common/ImageUpload";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings:update");

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Website Settings · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Website Settings"
        description="Manage your brand identity, contact details and social presence."
        icon={<SettingsIcon />}
      />

      <Tabs defaultValue="website">
        <TabsList>
          <TabsTrigger value="website">
            <Globe className="h-4 w-4" /> Website
          </TabsTrigger>
          <TabsTrigger value="services-hero">
            <LayoutTemplate className="h-4 w-4" /> Services Hero
          </TabsTrigger>
          <TabsTrigger value="home-hero">
            <LayoutTemplate className="h-4 w-4" /> Home Hero
          </TabsTrigger>
          <TabsTrigger value="social">
            <Share2 className="h-4 w-4" /> Social Links
          </TabsTrigger>
          <TabsTrigger value="home-about">
            <Home className="h-4 w-4" /> Home About
          </TabsTrigger>

          <TabsTrigger value="content">
            <Layers className="h-4 w-4" /> Content Sections
          </TabsTrigger>
          <TabsTrigger value="legal">
            <Scale className="h-4 w-4" /> Legal & Footer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="website">
          <WebsiteForm canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="services-hero">
          <ServicesHeroForm canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="home-hero">
          <HomeHeroForm canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="social">
          <SocialForm canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="home-about">
          <HomeAboutForm canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="content">
          <ContentSectionsForm canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="legal">
          <LegalAndFooterForm canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WebsiteForm({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { register, handleSubmit, reset, control } = useForm<WebsiteSettings>();
  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) =>
      settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  if (isLoading) return <Skeleton className="h-[420px] rounded-xl" />;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
      <Card>
        <CardHeader>
          <CardTitle>Brand & contact</CardTitle>
          <CardDescription>Core information about your organisation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Website name">
              <Input {...register("website_name")} disabled={!canEdit} />
            </Field>
            <Field label="Tagline">
              <Input {...register("tagline")} disabled={!canEdit} />
            </Field>
            <Field label="Theme primary color">
              <div className="flex gap-2">
                <Input type="color" {...register("theme_primary")} disabled={!canEdit} className="w-12 p-1 h-10" />
                <Input type="text" {...register("theme_primary")} disabled={!canEdit} placeholder="#0f172a" />
              </div>
            </Field>
            <Field label="Theme accent color">
              <div className="flex gap-2">
                <Input type="color" {...register("theme_accent")} disabled={!canEdit} className="w-12 p-1 h-10" />
                <Input type="text" {...register("theme_accent")} disabled={!canEdit} placeholder="#3b82f6" />
              </div>
            </Field>
            <Field label="Font family">
              <select
                {...register("font_family")}
                disabled={!canEdit}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Default (Outfit)</option>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Poppins">Poppins</option>
                <option value="Outfit">Outfit</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Nunito">Nunito</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Raleway">Raleway</option>
                <option value="Source Sans 3">Source Sans 3</option>
                <option value="DM Sans">DM Sans</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="Manrope">Manrope</option>
                <option value="Urbanist">Urbanist</option>
              </select>
            </Field>
            <Field label="Email">
              <Input type="email" {...register("email")} disabled={!canEdit} />
            </Field>
            <Field label="Phone">
              <Input {...register("phone")} disabled={!canEdit} />
            </Field>
            <Field label="WhatsApp">
              <Input {...register("whatsapp")} disabled={!canEdit} />
            </Field>
            <Field label="Google Reviews link">
              <Input {...register("google_reviews_link")} disabled={!canEdit} />
            </Field>
          </div>

          <Field label="Address">
            <Textarea {...register("address")} rows={2} disabled={!canEdit} />
          </Field>
          <Field label="Google Maps embed URL">
            <Textarea {...register("google_map_embed")} rows={2} disabled={!canEdit} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Logo">
              <Controller
                control={control}
                name="logo"
                render={({ field }) => (
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                    folder="nupun/brand"
                    aspect="wide"
                  />
                )}
              />
            </Field>
            <Field label="Favicon">
              <Controller
                control={control}
                name="favicon"
                render={({ field }) => (
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                    folder="nupun/brand"
                    aspect="square"
                  />
                )}
              />
            </Field>
          </div>
        </CardContent>
        {canEdit && (
          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button type="submit" loading={mutation.isPending}>
              <Save /> Save changes
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}

type HeroFormValues = { services_hero: ServicesHero };

function ServicesHeroForm({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { register, handleSubmit, reset, control } = useForm<HeroFormValues>({
    defaultValues: { services_hero: { slides: [] } },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "services_hero.slides" });

  useEffect(() => {
    if (data) {
      reset({
        services_hero: {
          slides: data.services_hero?.slides ?? [],
        },
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) => settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Services hero saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  if (isLoading) return <Skeleton className="h-[420px] rounded-xl" />;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate({ services_hero: v.services_hero }))}>
      <Card>
        <CardHeader>
          <CardTitle>Services page hero</CardTitle>
          <CardDescription>
            Headline, background image and highlight stats shown at the top of the Services page. Call / WhatsApp
            buttons use the phone &amp; WhatsApp numbers from the Website tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold">Hero Slides</Label>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ title: "", subtitle: "", button_text: "", button_link: "", image_desktop: null, image_mobile: null, order: fields.length })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Slide
              </Button>
            )}
          </div>

          {fields.length === 0 && (
            <div className="text-center p-6 border rounded-lg bg-muted/50 border-dashed">
              <p className="text-sm text-muted-foreground">No slides configured. Add your first slide above.</p>
            </div>
          )}

          {fields.length > 0 && (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {fields.map((f, i) => (
                <AccordionItem key={f.id} value={`slide-${i}`} className="border rounded-xl bg-card px-4">
                  <div className="flex items-center justify-between w-full">
                    <AccordionTrigger className="hover:no-underline flex-1 text-sm font-semibold py-4">
                      {f.title || `Slide ${i + 1}`}
                    </AccordionTrigger>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          remove(i);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <AccordionContent className="pt-2 pb-4 space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Heading">
                        <Input placeholder="E.g., Expert Home Nursing Care" {...register(`services_hero.slides.${i}.title` as const)} disabled={!canEdit} />
                      </Field>
                      <Field label="Button Text">
                        <Input placeholder="E.g., Book a Nurse" {...register(`services_hero.slides.${i}.button_text` as const)} disabled={!canEdit} />
                      </Field>
                    </div>
                    
                    <Field label="Description">
                      <Textarea
                        rows={2}
                        placeholder="Compassionate and reliable home healthcare..."
                        {...register(`services_hero.slides.${i}.subtitle` as const)}
                        disabled={!canEdit}
                      />
                    </Field>

                    <Field label="Button Link">
                      <Input placeholder="E.g., /services/home-nursing-care" {...register(`services_hero.slides.${i}.button_link` as const)} disabled={!canEdit} />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2 mt-2">
                      <Field label="Desktop Image (16:9)">
                        <Controller
                          control={control}
                          name={`services_hero.slides.${i}.image_desktop`}
                          render={({ field }) => (
                            <ImageUpload
                              value={field.value ?? undefined}
                              onChange={field.onChange}
                              folder="nupun/hero"
                              aspect="wide"
                            />
                          )}
                        />
                      </Field>
                      <Field label="Mobile Image (9:16)">
                        <Controller
                          control={control}
                          name={`services_hero.slides.${i}.image_mobile`}
                          render={({ field }) => (
                            <ImageUpload
                              value={field.value ?? undefined}
                              onChange={field.onChange}
                              folder="nupun/hero"
                              aspect="portrait"
                            />
                          )}
                        />
                      </Field>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
        {canEdit && (
          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button type="submit" loading={mutation.isPending}>
              <Save /> Save changes
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}

type HomeHeroFormValues = {
  home_hero: WebsiteSettings["home_hero"];
  hero_headline: string;
  hero_subtitle: string;
  hero_description: string;
  hero_cta_primary_text: string;
  hero_cta_secondary_text: string;
};

function HomeHeroForm({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { register, handleSubmit, reset, control } = useForm<HomeHeroFormValues>({
    defaultValues: { 
      home_hero: { trust_badge_text: "", trust_badge_quote: "", trust_badge_avatars: [], slider_images: [], slider_images_mobile: [], stats: [] },
      hero_headline: "",
      hero_subtitle: "",
      hero_description: "",
      hero_cta_primary_text: "",
      hero_cta_secondary_text: "",
    },
  });
  const avatarsField = useFieldArray({ control, name: "home_hero.trust_badge_avatars" });
  const sliderField = useFieldArray({ control, name: "home_hero.slider_images" });
  const sliderMobileField = useFieldArray({ control, name: "home_hero.slider_images_mobile" });
  const statsField = useFieldArray({ control, name: "home_hero.stats" });

  useEffect(() => {
    if (data) {
      reset({
        home_hero: {
          trust_badge_text: data.home_hero?.trust_badge_text ?? "",
          trust_badge_quote: data.home_hero?.trust_badge_quote ?? "",
          trust_badge_avatars: data.home_hero?.trust_badge_avatars ?? [],
          slider_images: data.home_hero?.slider_images ?? [],
          slider_images_mobile: data.home_hero?.slider_images_mobile ?? [],
          stats: data.home_hero?.stats ?? [],
        },
        hero_headline: data.hero_headline ?? "",
        hero_subtitle: data.hero_subtitle ?? "",
        hero_description: data.hero_description ?? "",
        hero_cta_primary_text: data.hero_cta_primary_text ?? "",
        hero_cta_secondary_text: data.hero_cta_secondary_text ?? "",
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) => settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Home hero saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  if (isLoading) return <Skeleton className="h-[420px] rounded-xl" />;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate({ 
      home_hero: v.home_hero,
      hero_headline: v.hero_headline,
      hero_subtitle: v.hero_subtitle,
      hero_description: v.hero_description,
      hero_cta_primary_text: v.hero_cta_primary_text,
      hero_cta_secondary_text: v.hero_cta_secondary_text,
    }))}>
      <Card>
        <CardHeader>
          <CardTitle>Home page hero</CardTitle>
          <CardDescription>
            Manage the hero text content, CTA buttons, background slider images (desktop & mobile) and the floating Trust Badge details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-6 pt-2 pb-6 border-b">
            <Field label="Hero Headline">
              <Input
                placeholder="Trusted Home Health Care at Your Doorstep"
                {...register("hero_headline")}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Hero Subtitle">
              <Input
                placeholder="Har Pal Aapke Apno Ke Sath"
                {...register("hero_subtitle")}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Hero Description">
              <Textarea
                rows={3}
                placeholder="Trusted Home Nursing, Patient Attendant, Elderly Care..."
                {...register("hero_description")}
                disabled={!canEdit}
              />
            </Field>
          </div>

          <div className="space-y-4 pt-2 pb-6 border-b">
            <h3 className="font-semibold text-lg">CTA Buttons</h3>
            <p className="text-sm text-muted-foreground">Customise the text shown on the hero call-to-action buttons.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Primary Button Text">
                <Input
                  placeholder="Book Trusted Care"
                  {...register("hero_cta_primary_text")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Secondary Button Text">
                <Input
                  placeholder="WhatsApp Us"
                  {...register("hero_cta_secondary_text")}
                  disabled={!canEdit}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Desktop Slider Images (16:9)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Shown on desktops and tablets. Use landscape/wide images.</p>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sliderField.append({ url: "" })}
                >
                  <Plus className="h-4 w-4" /> Add Image
                </Button>
              )}
            </div>
            {sliderField.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No slider images uploaded. Default premium images will be used.</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sliderField.fields.map((f, i) => (
                <div key={f.id} className="relative group">
                  <Controller
                    control={control}
                    name={`home_hero.slider_images.${i}`}
                    render={({ field }) => (
                      <ImageUpload
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        folder="nupun/hero"
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
                      onClick={() => sliderField.remove(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Mobile Slider Images (9:16)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Shown on mobile phones. Use portrait/vertical images for best results.</p>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sliderMobileField.append({ url: "" })}
                >
                  <Plus className="h-4 w-4" /> Add Mobile Image
                </Button>
              )}
            </div>
            {sliderMobileField.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No mobile images uploaded. Desktop images will be used on mobile as fallback.</p>
            )}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sliderMobileField.fields.map((f, i) => (
                <div key={f.id} className="relative group">
                  <Controller
                    control={control}
                    name={`home_hero.slider_images_mobile.${i}`}
                    render={({ field }) => (
                      <ImageUpload
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        folder="nupun/hero/mobile"
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
                      onClick={() => sliderMobileField.remove(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Highlight Stats</h3>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => statsField.append({ value: 0, suffix: "+", label: "" })}
                >
                  <Plus className="h-4 w-4" /> Add Stat
                </Button>
              )}
            </div>
            {statsField.fields.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">No stats added yet. Add up to 3 stats (e.g. 100+ Verified Caregivers).</p>
            )}
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
                          <div className="w-24 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Value (Number)</Label>
                            <Input type="number" placeholder="100" {...register(`home_hero.stats.${i}.value` as const, { valueAsNumber: true })} disabled={!canEdit} />
                          </div>
                          <div className="w-24 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Suffix</Label>
                            <Input placeholder="+" {...register(`home_hero.stats.${i}.suffix` as const)} disabled={!canEdit} />
                          </div>
                          <div className="flex-1 space-y-1.5 min-w-[200px]">
                            <Label className="text-xs text-muted-foreground">Label</Label>
                            <Input placeholder="Verified Caregivers" {...register(`home_hero.stats.${i}.label` as const)} disabled={!canEdit} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
          </div>

          <div className="pt-6 border-t">
            <h3 className="font-semibold text-lg mb-4">Trust Badge</h3>
            <div className="space-y-6">
              <Field label="Trust Badge Text">
                <Input
                  placeholder="Trusted by 5,000+"
                  {...register("home_hero.trust_badge_text")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Trust Badge Quote">
                <Textarea
                  rows={2}
                  placeholder='"Their nursing staff is extremely professional..."'
                  {...register("home_hero.trust_badge_quote")}
                  disabled={!canEdit}
                />
              </Field>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Avatars (Small overlapping circles)</Label>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarsField.append({ url: "" })}
                    >
                      <Plus className="h-4 w-4" /> Add Avatar
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  {avatarsField.fields.map((f, i) => (
                    <div key={f.id} className="relative group w-20 h-20">
                      <Controller
                        control={control}
                        name={`home_hero.trust_badge_avatars.${i}`}
                        render={({ field }) => (
                          <ImageUpload
                            value={field.value ?? undefined}
                            onChange={field.onChange}
                            folder="nupun/hero"
                            aspect="square"
                          />
                        )}
                      />
                      {canEdit && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => avatarsField.remove(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        {canEdit && (
          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button type="submit" loading={mutation.isPending}>
              <Save /> Save changes
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}

const SOCIAL_FIELDS: { name: keyof SocialLinks; label: string; icon: typeof Facebook }[] = [
  { name: "facebook", label: "Facebook", icon: Facebook },
  { name: "instagram", label: "Instagram", icon: Instagram },
  { name: "youtube", label: "YouTube", icon: Youtube },
  { name: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

function SocialForm({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "social"],
    queryFn: () => settingsService.getSocial(),
  });
  const { register, handleSubmit, reset } = useForm<SocialLinks>();
  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<SocialLinks>) => settingsService.updateSocial(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "social"] });
      toast.success("Social links saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  if (isLoading) return <Skeleton className="h-[360px] rounded-xl" />;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
      <Card>
        <CardHeader>
          <CardTitle>Social profiles</CardTitle>
          <CardDescription>Links displayed across your website.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <f.icon className="h-4 w-4 text-muted-foreground" /> {f.label}
              </Label>
              <Input
                placeholder="https://…"
                {...register(f.name)}
                disabled={!canEdit}
              />
            </div>
          ))}
        </CardContent>
        {canEdit && (
          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button type="submit" loading={mutation.isPending}>
              <Save /> Save changes
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}


const ICON_OPTIONS = [
  { value: "heart-pulse", label: "Heart Pulse" },
  { value: "icu", label: "ICU" },
  { value: "shield-check", label: "Shield Check" },
  { value: "clock", label: "Clock / 24×7" },
];

function HomeAboutForm({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { register, handleSubmit, reset, control } = useForm<WebsiteSettings>();
  const featuresField = useFieldArray({ control, name: "home_about_features" });
  const tilesField = useFieldArray({ control, name: "home_about_tiles" });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) => settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Home About section saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const swap = (i: number, dir: "up" | "down") => {
    if (dir === "up" && i > 0) featuresField.move(i, i - 1);
    if (dir === "down" && i < featuresField.fields.length - 1) featuresField.move(i, i + 1);
  };

  if (isLoading) return <Skeleton className="h-[400px] rounded-xl" />;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate({
      home_about_heading: v.home_about_heading,
      home_about_description: v.home_about_description,
      home_about_features: v.home_about_features,
      home_about_tiles: v.home_about_tiles,
    }))}>
      <Card>
        <CardHeader>
          <CardTitle>Home Page — About Us Section</CardTitle>
          <CardDescription>
            Manage the heading, description, 3 feature highlights, and 4 image cards shown in the About section on the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <Field label="Section Heading">
              <Input
                {...register("home_about_heading")}
                placeholder="Professionals dedicated to your health"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Section Description">
              <Textarea
                {...register("home_about_description")}
                rows={3}
                placeholder="Nupun Home Health Care provides a qualified team of nursing staff..."
                disabled={!canEdit}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Feature Highlights (left side)</Label>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => featuresField.append({ title: "", description: "", icon: "heart-pulse", icon_image: null })}
                >
                  <Plus className="h-4 w-4" /> Add Feature
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {featuresField.fields.map((f, i) => {
                  const currentTitle = featuresField.fields[i]?.title;
                  return (
                    <AccordionItem key={f.id} value={`feature-${f.id}`} className="border rounded-lg bg-muted/10 px-4">
                      <div className="flex items-center gap-2 w-full group">
                        <div className="flex flex-col">
                           <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.preventDefault(); swap(i, "up"); }}><MoveUp className="h-3 w-3" /></Button>
                           <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.preventDefault(); swap(i, "down"); }}><MoveDown className="h-3 w-3" /></Button>
                        </div>
                        <AccordionTrigger className="hover:no-underline flex-1 py-4 text-sm font-semibold">
                          Feature {i + 1} {currentTitle ? `— ${currentTitle}` : ""}
                        </AccordionTrigger>
                        {canEdit && (
                          <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); featuresField.remove(i); }} className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 z-10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <AccordionContent className="pb-4">
                        <div className="flex gap-4 items-start pt-2">
                          <div className="w-32 shrink-0 space-y-1.5">
                            <Label className="text-xs">Icon Image (PNG)</Label>
                            <Controller
                              control={control}
                              name={`home_about_features.${i}.icon_image` as const}
                              render={({ field }) => (
                                <ImageUpload
                                  value={field.value ? (typeof field.value === 'string' ? { url: field.value, public_id: '' } : field.value) : undefined}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-3 items-end">
                              <div className="flex-1 space-y-1.5">
                                <Label className="text-xs">Title</Label>
                                <Input {...register(`home_about_features.${i}.title` as const)} disabled={!canEdit} />
                              </div>
                              <div className="w-36 space-y-1.5">
                                <Label className="text-xs">Fallback Icon</Label>
                                <Controller
                                  control={control}
                                  name={`home_about_features.${i}.icon` as const}
                                  render={({ field }) => (
                                    <select
                                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                      value={field.value || "heart-pulse"}
                                      onChange={field.onChange}
                                      disabled={!canEdit}
                                    >
                                      {ICON_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Description</Label>
                              <Textarea
                                {...register(`home_about_features.${i}.description` as const)}
                                rows={2}
                                disabled={!canEdit}
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>


          {/* ── Image Tiles (Categories) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Category Cards (Right Side)</Label>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    tilesField.append({
                      image: null,
                      count: "",
                      title: "",
                      description: "",
                      cta_label: "",
                      cta_link: "/booking",
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Add Tile
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {tilesField.fields.map((f, i) => {
                  const currentTitle = tilesField.fields[i]?.title;
                  return (
                    <AccordionItem key={f.id} value={`tile-${f.id}`} className="border rounded-lg bg-muted/10 px-4">
                      <div className="flex items-center justify-between w-full group">
                        <AccordionTrigger className="hover:no-underline flex-1 py-4 text-sm font-semibold">
                          Tile {i + 1} {currentTitle ? `— ${currentTitle}` : ""}
                        </AccordionTrigger>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 z-10"
                            onClick={(e) => {
                              e.preventDefault();
                              tilesField.remove(i);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <AccordionContent className="pb-4">
                        <div className="flex gap-4 items-start pt-2">
                          <div className="w-48 shrink-0 space-y-1.5">
                            <Label className="text-xs">Image</Label>
                            <Controller
                              control={control}
                              name={`home_about_tiles.${i}.image` as const}
                              render={({ field }) => (
                                <ImageUpload
                                  value={field.value ? (typeof field.value === 'string' ? { url: field.value, public_id: '' } : field.value) : undefined}
                                  onChange={field.onChange}
                                  folder="nupun/home-about"
                                  aspect="square"
                                />
                              )}
                            />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Count (e.g. 120+)</Label>
                                <Input {...register(`home_about_tiles.${i}.count` as const)} disabled={!canEdit} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Title</Label>
                                <Input {...register(`home_about_tiles.${i}.title` as const)} disabled={!canEdit} />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Description</Label>
                              <Input {...register(`home_about_tiles.${i}.description` as const)} disabled={!canEdit} />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
        </CardContent>
        {canEdit && (
          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button type="submit" loading={mutation.isPending}>
              <Save /> Save changes
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}

function ContentSectionsForm({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { register, handleSubmit, reset, control } = useForm<WebsiteSettings>();
  const whyChooseField = useFieldArray({ control, name: "why_choose_items" });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) => settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Content sections saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  if (isLoading) return <Skeleton className="h-[400px] rounded-xl" />;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
      <Card>
        <CardHeader>
          <CardTitle>Content Sections</CardTitle>
          <CardDescription>Manage shared sections like 'Why Choose Us' and 'Conditions We Support'.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Why Choose Nupun (Services Page)</Label>
              {canEdit && (
                <Button type="button" variant="outline" size="sm" onClick={() => whyChooseField.append({ title: "", detail: "" })}>
                  <Plus className="h-4 w-4" /> Add Reason
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {whyChooseField.fields.map((f, i) => {
                  const currentTitle = whyChooseField.fields[i]?.title;
                  return (
                    <AccordionItem key={f.id} value={`why-${f.id}`} className="border rounded-lg bg-muted/10 px-4">
                      <div className="flex items-center justify-between w-full group">
                        <AccordionTrigger className="hover:no-underline flex-1 py-4 text-sm font-semibold">
                          Reason {i + 1} {currentTitle ? `— ${currentTitle}` : ""}
                        </AccordionTrigger>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 z-10"
                            onClick={(e) => {
                              e.preventDefault();
                              whyChooseField.remove(i);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <AccordionContent className="pb-4">
                        <div className="flex gap-3 items-end pt-2">
                          <div className="w-1/3 space-y-1.5">
                            <Label className="text-xs">Title</Label>
                            <Input {...register(`why_choose_items.${i}.title` as const)} disabled={!canEdit} />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-xs">Detail / Description</Label>
                            <Input {...register(`why_choose_items.${i}.detail` as const)} disabled={!canEdit} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>

          {/* Why Choose Section Header */}
          <div className="space-y-4 pt-4 border-t border-border">
            <Label className="text-base font-semibold">Why Choose / Commitment Section (Homepage)</Label>
            <p className="text-xs text-muted-foreground">Section header, commitment items, team image, and floating badge on the homepage.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Eyebrow Badge</Label>
                <Input {...register("why_choose_eyebrow")} placeholder="Our Promise" disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Section Title</Label>
                <Input {...register("why_choose_title")} placeholder="Why Choose Nupun Home Care?" disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Section Description</Label>
              <Input {...register("why_choose_description")} placeholder="We go beyond standard care..." disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Commitment Subtitle</Label>
              <Input {...register("commitment_subtitle")} placeholder="Our Commitment to Excellence" disabled={!canEdit} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Floating Badge Value</Label>
                <Input {...register("commitment_badge_value")} placeholder="100%" disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Floating Badge Label</Label>
                <Input {...register("commitment_badge_label")} placeholder="Verified Staff" disabled={!canEdit} />
              </div>
            </div>
          </div>

          {/* Commitment Section Image */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Label>Commitment Section — Team Image</Label>
            <p className="text-xs text-muted-foreground">
              This image appears on the homepage &quot;Why Choose Nupun&quot; section (right side).
            </p>
            <Controller
              control={control}
              name="commitment_image"
              render={({ field }) => (
                <ImageUpload
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  folder="nupun/commitment"
                  aspect="wide"
                />
              )}
            />
          </div>
        </CardContent>
        {canEdit && (
          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button type="submit" loading={mutation.isPending}>
              <Save /> Save changes
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}

function LegalAndFooterForm({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { register, handleSubmit, reset } = useForm<WebsiteSettings>();

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) => settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  if (isLoading) return <Skeleton className="h-[400px] rounded-xl" />;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
      <Card>
        <CardHeader>
          <CardTitle>Footer & CTA</CardTitle>
          <CardDescription>Manage footer text and call to action content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Footer Tagline">
            <Input {...register("footer_tagline")} disabled={!canEdit} />
          </Field>
          <Field label="Footer Description">
            <Textarea {...register("footer_description")} rows={3} disabled={!canEdit} />
          </Field>
          <Field label="CTA Title">
            <Input {...register("cta_title")} disabled={!canEdit} />
          </Field>
          <Field label="CTA Description">
            <Textarea {...register("cta_description")} rows={2} disabled={!canEdit} />
          </Field>
        </CardContent>
        {canEdit && (
          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button type="submit" loading={mutation.isPending}>
              <Save /> Save changes
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}
