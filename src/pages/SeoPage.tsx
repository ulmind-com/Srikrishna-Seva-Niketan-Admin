import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { Helmet } from "react-helmet-async";
import { Search, Save, Plus, FileCode } from "lucide-react";
import { toast } from "sonner";
import type { SEOSettings } from "@/types/models";
import { settingsService } from "@/services/settings.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TagsInput } from "@/components/common/TagsInput";

type FormValues = Partial<SEOSettings> & { page_key: string; meta_keywords: string[] };

export function SeoPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("seo:update");
  const [activeKey, setActiveKey] = useState<string>("global");

  const { data: pages, isLoading } = useQuery({
    queryKey: ["seo", "all"],
    queryFn: () => settingsService.listSeo(),
  });

  const current = pages?.find((p) => p.page_key === activeKey);

  const { register, handleSubmit, reset, control } = useForm<FormValues>({
    defaultValues: { page_key: "global", meta_keywords: [] },
  });

  useEffect(() => {
    reset(
      current
        ? { ...current, meta_keywords: current.meta_keywords ?? [] }
        : { page_key: activeKey, meta_keywords: [] }
    );
  }, [current, activeKey, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => settingsService.upsertSeo(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo"] });
      toast.success("SEO settings saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const addPage = () => {
    const key = window.prompt("Page key (e.g. home, about, services)")?.trim();
    if (key) setActiveKey(key);
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>SEO · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="SEO Management"
        description="Configure meta tags, Open Graph and structured data per page."
        icon={<Search />}
        actions={
          canEdit && (
            <Button variant="outline" onClick={addPage}>
              <Plus /> New page
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Page list */}
        <Card className="h-fit p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {[
                ...new Set([
                  "global",
                  activeKey,
                  ...(pages?.map((p) => p.page_key) ?? []),
                ]),
              ].map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveKey(key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors",
                    activeKey === key
                      ? "bg-primary/10 text-accent"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <FileCode className="h-4 w-4" /> {key}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{activeKey} page SEO</CardTitle>
              <CardDescription>
                These tags are served to the public website for this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <input type="hidden" {...register("page_key")} />
              <div className="space-y-1.5">
                <Label>Meta title</Label>
                <Input {...register("meta_title")} disabled={!canEdit} placeholder="Page title for search engines" />
              </div>
              <div className="space-y-1.5">
                <Label>Meta description</Label>
                <Textarea {...register("meta_description")} rows={3} disabled={!canEdit} placeholder="150-160 character summary" />
              </div>
              <div className="space-y-1.5">
                <Label>Meta keywords</Label>
                <Controller
                  control={control}
                  name="meta_keywords"
                  render={({ field }) => (
                    <TagsInput value={field.value ?? []} onChange={field.onChange} placeholder="Add keyword…" />
                  )}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Canonical URL</Label>
                  <Input {...register("canonical_url")} disabled={!canEdit} placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                  <Label>OG image URL</Label>
                  <Input {...register("og_image")} disabled={!canEdit} placeholder="https://…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Schema markup (JSON-LD)</Label>
                <Textarea {...register("schema_markup")} rows={4} disabled={!canEdit} className="font-mono text-xs" placeholder='{ "@context": "https://schema.org", ... }' />
              </div>
            </CardContent>
            {canEdit && (
              <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
                <Button type="submit" loading={mutation.isPending}>
                  <Save /> Save SEO
                </Button>
              </div>
            )}
          </Card>
        </form>
      </div>
    </div>
  );
}
