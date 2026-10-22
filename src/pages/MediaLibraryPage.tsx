import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Images, UploadCloud, Copy, Trash2, Loader2, Check, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { uploadService } from "@/services/upload.service";
import { normalizeError } from "@/services/api/client";
import type { ImageAsset } from "@/types/models";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "nupun.media_library";

function loadAssets(): ImageAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImageAsset[]) : [];
  } catch {
    return [];
  }
}

export function MediaLibraryPage() {
  const [assets, setAssets] = useState<ImageAsset[]>(loadAssets);
  const [folder, setFolder] = useState("nupun/media");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImageAsset | null>(null);

  const persist = (next: ImageAsset[]) => {
    setAssets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploading(true);
      try {
        const uploaded = await Promise.all(
          files.map((file) => uploadService.image(file, folder))
        );
        persist([...uploaded, ...loadAssets()]);
        toast.success(`${uploaded.length} file(s) uploaded`);
      } catch (err) {
        toast.error(normalizeError(err).message);
      } finally {
        setUploading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folder]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    disabled: uploading,
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    toast.success("URL copied");
    setTimeout(() => setCopied(null), 1500);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.public_id) {
        await uploadService.remove(deleteTarget.public_id, "image");
      }
      persist(loadAssets().filter((a) => a.public_id !== deleteTarget.public_id));
      toast.success("Asset deleted");
    } catch (err) {
      toast.error(normalizeError(err).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Media Library · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Media Library"
        description="Upload and manage images stored on Cloudinary."
        icon={<Images />}
      />

      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full space-y-1.5 sm:max-w-xs">
            <Label htmlFor="folder">Upload folder</Label>
            <div className="relative">
              <FolderOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40",
            isDragActive && "border-primary bg-secondary"
          )}
        >
          <input {...getInputProps()} />
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-card text-primary shadow-soft">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>
          <p className="font-medium">
            {uploading
              ? "Uploading…"
              : isDragActive
                ? "Drop files here"
                : "Drag & drop images, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP · Multiple files supported
          </p>
        </div>
      </Card>

      {assets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Images />}
            title="No media yet"
            description="Uploaded images will appear here in a grid."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {assets.map((asset, i) => (
            <motion.div
              key={asset.public_id ?? asset.url}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-soft"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={asset.url}
                  alt={asset.public_id ?? "media"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => copyUrl(asset.url)}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/90 text-slate-900 transition-transform hover:scale-105"
                  title="Copy URL"
                >
                  {copied === asset.url ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setDeleteTarget(asset)}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-destructive text-white transition-transform hover:scale-105"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete asset?"
        description="This will remove the image from Cloudinary and your library."
        onConfirm={handleDelete}
      />
    </div>
  );
}
