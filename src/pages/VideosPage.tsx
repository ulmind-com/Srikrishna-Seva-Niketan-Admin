import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { ResourceView } from "@/components/resource/ResourceView";
import { videosConfig } from "@/config/resources/content.config";
import { settingsService } from "@/services/settings.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/common/ImageUpload";
import type { WebsiteSettings, ImageAsset } from "@/types/models";

export function VideosPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings:update");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
  });

  const { handleSubmit, reset, control } = useForm<{ videos_wall_image: ImageAsset | null }>();

  useEffect(() => {
    if (data) {
      reset({ videos_wall_image: data.videos_wall_image ?? null });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: Partial<WebsiteSettings>) => settingsService.updateWebsite(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Video Section Appearance</CardTitle>
          <CardDescription>
            Customise the large collage image shown next to the video testimonials.
          </CardDescription>
        </CardHeader>
        {isLoading ? (
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        ) : (
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <CardContent>
              <div className="max-w-md">
                <label className="text-sm font-medium mb-3 block">Wall Image (Portrait 4:5)</label>
                <Controller
                  control={control}
                  name="videos_wall_image"
                  render={({ field }) => (
                    <ImageUpload
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      folder="nupun/brand"
                      aspect="portrait"
                    />
                  )}
                />
              </div>
            </CardContent>
            {canEdit && (
              <div className="flex justify-start border-t border-border bg-muted/30 px-6 py-4">
                <Button type="submit" loading={mutation.isPending}>
                  <Save className="mr-2 h-4 w-4" /> Save changes
                </Button>
              </div>
            )}
          </form>
        )}
      </Card>
      
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Manage Videos</h2>
        <ResourceView config={videosConfig} />
      </div>
    </div>
  );
}
