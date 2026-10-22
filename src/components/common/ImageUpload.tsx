import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadService } from "@/services/upload.service";
import { normalizeError } from "@/services/api/client";
import type { ImageAsset } from "@/types/models";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: ImageAsset | null;
  onChange: (asset: ImageAsset | null) => void;
  folder?: string;
  className?: string;
  aspect?: "square" | "video" | "wide" | "portrait";
}

export function ImageUpload({
  value,
  onChange,
  folder = "nupun/images",
  className,
  aspect = "video",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      try {
        const asset = await uploadService.image(file, folder);
        onChange(asset);
        toast.success("Image uploaded");
      } catch (err) {
        toast.error(normalizeError(err).message);
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: uploading,
  });

  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "wide"
        ? "aspect-[3/1]"
        : aspect === "portrait"
          ? "aspect-[9/16]"
          : "aspect-video";

  if (value?.url) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border",
          aspectClass,
          className
        )}
      >
        <img
          src={value.url}
          alt={value.alt ?? "Uploaded"}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-slate-950/60 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50",
        aspectClass,
        isDragActive && "border-primary bg-secondary",
        className
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : (
        <>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-card text-primary shadow-soft">
            <ImagePlus className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? "Drop the image" : "Click or drag to upload"}
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
        </>
      )}
    </div>
  );
}
