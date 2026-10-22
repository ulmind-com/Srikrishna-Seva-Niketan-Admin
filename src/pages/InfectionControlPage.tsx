import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { Helmet } from "react-helmet-async";
import {
  ShieldCheck,
  Save,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  infectionControlService,
  type InfectionControlContent,
} from "@/services/infection-control.service";
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

type FormValues = Omit<InfectionControlContent, "id" | "created_at" | "updated_at">;

export function InfectionControlPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings:update");

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Infection Control Page · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Infection Control Page"
        description="Manage all content for the Infection Control Nurse Services page."
        icon={<ShieldCheck />}
      />
      <InfectionControlForm canEdit={canEdit} />
    </div>
  );
}

function InfectionControlForm({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ic-page-content"],
    queryFn: () => infectionControlService.getContent(),
  });

  const form = useForm<FormValues>({
    defaultValues: {
      hero_heading: "",
      hero_subheading: "",
      hero_short_text: "",
      hero_btn_primary: "",
      hero_btn_secondary: "",
      intro_heading: "",
      intro_content: "",
      services: [],
      why_choose_items: [],
      how_it_works_steps: [],
      faqs: [],
      enquiry_heading: "",
      enquiry_subheading: "",
      enquiry_requirement_options: [],
      home_card_title: "",
      home_card_description: "",
      home_card_button_text: "",
    },
  });

  const servicesArr = useFieldArray({ control: form.control, name: "services" });
  const whyChooseArr = useFieldArray({ control: form.control, name: "why_choose_items" });
  const howItWorksArr = useFieldArray({ control: form.control, name: "how_it_works_steps" });
  const faqsArr = useFieldArray({ control: form.control, name: "faqs" });

  useEffect(() => {
    if (data) {
      form.reset({
        hero_heading: data.hero_heading || "",
        hero_subheading: data.hero_subheading || "",
        hero_short_text: data.hero_short_text || "",
        hero_btn_primary: data.hero_btn_primary || "",
        hero_btn_secondary: data.hero_btn_secondary || "",
        intro_heading: data.intro_heading || "",
        intro_content: data.intro_content || "",
        services: data.services || [],
        why_choose_items: data.why_choose_items || [],
        how_it_works_steps: data.how_it_works_steps || [],
        faqs: data.faqs || [],
        enquiry_heading: data.enquiry_heading || "",
        enquiry_subheading: data.enquiry_subheading || "",
        enquiry_requirement_options: data.enquiry_requirement_options || [],
        home_card_title: data.home_card_title || "",
        home_card_description: data.home_card_description || "",
        home_card_button_text: data.home_card_button_text || "",
      });
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => infectionControlService.updateContent(values),
    onSuccess: () => {
      toast.success("Infection Control page updated successfully");
      qc.invalidateQueries({ queryKey: ["ic-page-content"] });
    },
    onError: (err) => {
      const e = normalizeError(err);
      toast.error(e.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
      <Tabs defaultValue="hero">
        <TabsList className="flex-wrap">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="intro">Introduction</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="why-choose">Why Choose Us</TabsTrigger>
          <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="enquiry">Enquiry Section</TabsTrigger>
          <TabsTrigger value="home-card">Home Page Card</TabsTrigger>
        </TabsList>

        {/* ── Hero ──────────────────────────────────────── */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>Edit the main hero banner content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Heading</Label>
                <Input {...form.register("hero_heading")} disabled={!canEdit} />
              </div>
              <div>
                <Label>Subheading</Label>
                <Textarea {...form.register("hero_subheading")} disabled={!canEdit} rows={2} />
              </div>
              <div>
                <Label>Short Text</Label>
                <Textarea {...form.register("hero_short_text")} disabled={!canEdit} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Button Text</Label>
                  <Input {...form.register("hero_btn_primary")} disabled={!canEdit} />
                </div>
                <div>
                  <Label>Secondary Button Text</Label>
                  <Input {...form.register("hero_btn_secondary")} disabled={!canEdit} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Introduction ──────────────────────────────── */}
        <TabsContent value="intro">
          <Card>
            <CardHeader>
              <CardTitle>Short Introduction</CardTitle>
              <CardDescription>Edit the introduction section below the hero.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Heading</Label>
                <Input {...form.register("intro_heading")} disabled={!canEdit} />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea {...form.register("intro_content")} disabled={!canEdit} rows={5} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Services ──────────────────────────────────── */}
        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Our Comprehensive Services</CardTitle>
                <CardDescription>Manage individual service cards.</CardDescription>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => servicesArr.append({ title: "", description: "", order: servicesArr.fields.length })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Service
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {servicesArr.fields.map((field, idx) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Service #{idx + 1}</span>
                    <div className="flex gap-1">
                      {idx > 0 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => servicesArr.swap(idx, idx - 1)}>
                          <MoveUp className="h-4 w-4" />
                        </Button>
                      )}
                      {idx < servicesArr.fields.length - 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => servicesArr.swap(idx, idx + 1)}>
                          <MoveDown className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => servicesArr.remove(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input {...form.register(`services.${idx}.title`)} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea {...form.register(`services.${idx}.description`)} disabled={!canEdit} rows={2} />
                  </div>
                </div>
              ))}
              {servicesArr.fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No services added yet. Click "Add Service" to start.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Why Choose Us ─────────────────────────────── */}
        <TabsContent value="why-choose">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Why Choose Us</CardTitle>
                <CardDescription>Manage why-choose-us cards.</CardDescription>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => whyChooseArr.append({ title: "", description: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {whyChooseArr.fields.map((field, idx) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Item #{idx + 1}</span>
                    {canEdit && (
                      <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => whyChooseArr.remove(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input {...form.register(`why_choose_items.${idx}.title`)} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea {...form.register(`why_choose_items.${idx}.description`)} disabled={!canEdit} rows={2} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── How It Works ──────────────────────────────── */}
        <TabsContent value="how-it-works">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>Manage the step-by-step process.</CardDescription>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => howItWorksArr.append({ step_label: `Step ${howItWorksArr.fields.length + 1}`, title: "", description: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Step
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {howItWorksArr.fields.map((field, idx) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Step #{idx + 1}</span>
                    <div className="flex gap-1">
                      {idx > 0 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => howItWorksArr.swap(idx, idx - 1)}>
                          <MoveUp className="h-4 w-4" />
                        </Button>
                      )}
                      {idx < howItWorksArr.fields.length - 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => howItWorksArr.swap(idx, idx + 1)}>
                          <MoveDown className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => howItWorksArr.remove(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Step Label</Label>
                      <Input {...form.register(`how_it_works_steps.${idx}.step_label`)} disabled={!canEdit} />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input {...form.register(`how_it_works_steps.${idx}.title`)} disabled={!canEdit} />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea {...form.register(`how_it_works_steps.${idx}.description`)} disabled={!canEdit} rows={2} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FAQ ───────────────────────────────────────── */}
        <TabsContent value="faq">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Manage FAQ entries for the page.</CardDescription>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => faqsArr.append({ question: "", answer: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add FAQ
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {faqsArr.fields.map((field, idx) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">FAQ #{idx + 1}</span>
                    <div className="flex gap-1">
                      {idx > 0 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => faqsArr.swap(idx, idx - 1)}>
                          <MoveUp className="h-4 w-4" />
                        </Button>
                      )}
                      {idx < faqsArr.fields.length - 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => faqsArr.swap(idx, idx + 1)}>
                          <MoveDown className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => faqsArr.remove(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Question</Label>
                    <Input {...form.register(`faqs.${idx}.question`)} disabled={!canEdit} />
                  </div>
                  <div>
                    <Label>Answer</Label>
                    <Textarea {...form.register(`faqs.${idx}.answer`)} disabled={!canEdit} rows={3} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Enquiry Section ──────────────────────────── */}
        <TabsContent value="enquiry">
          <Card>
            <CardHeader>
              <CardTitle>Enquiry Section</CardTitle>
              <CardDescription>Edit the enquiry form section headings and dropdown options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Heading</Label>
                <Input {...form.register("enquiry_heading")} disabled={!canEdit} />
              </div>
              <div>
                <Label>Subheading</Label>
                <Textarea {...form.register("enquiry_subheading")} disabled={!canEdit} rows={3} />
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Requirement Dropdown Options</Label>
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const current = form.getValues("enquiry_requirement_options") || [];
                        form.setValue("enquiry_requirement_options", [...current, ""]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Option
                    </Button>
                  )}
                </div>
                {(form.watch("enquiry_requirement_options") || []).map((_, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      {...form.register(`enquiry_requirement_options.${idx}`)}
                      disabled={!canEdit}
                      placeholder={`Option ${idx + 1}`}
                    />
                    {canEdit && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive shrink-0"
                        onClick={() => {
                          const current = form.getValues("enquiry_requirement_options") || [];
                          form.setValue(
                            "enquiry_requirement_options",
                            current.filter((_, i) => i !== idx)
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Home Page Card ────────────────────────────── */}
        <TabsContent value="home-card">
          <Card>
            <CardHeader>
              <CardTitle>Home Page Card</CardTitle>
              <CardDescription>Edit the service card shown on the home page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input {...form.register("home_card_title")} disabled={!canEdit} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea {...form.register("home_card_description")} disabled={!canEdit} rows={3} />
              </div>
              <div>
                <Label>Button Text</Label>
                <Input {...form.register("home_card_button_text")} disabled={!canEdit} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      {canEdit && (
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={mutation.isPending} size="lg">
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </form>
  );
}
