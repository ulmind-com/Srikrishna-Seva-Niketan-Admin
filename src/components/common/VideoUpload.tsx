import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Film, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadService } from "@/services/upload.service";
import { normalizeError } from "@/services/api/client";
import type { FileAsset } from "@/types/models";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  value?: FileAsset | null;
  onChange: (asset: FileAsset | null) => void;
  folder?: string;
  className?: string;
}

/** Upload a video file to Cloudinary and display a preview / filename. */
export function VideoUpload({
  value,
  onChange,
  folder = "nupun/videos",
  className,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      setProgress(0);

      // Simulate progress while upload is in-flight
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 8, 90));
      }, 300);

      try {
        const asset = await uploadService.video(file, folder);
        clearInterval(interval);
        setProgress(100);
        onChange(asset);
        toast.success("Video uploaded");
      } catch (err) {
        clearInterval(interval);
        toast.error(normalizeError(err).message);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [folder, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [],
      "video/webm": [],
      "video/quicktime": [],
      "video/x-msvideo": [],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  /* ---- Has value ---- */
  if (value?.url) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border",
          className
        )}
      >
        <video
          src={value.url}
          controls
          className="aspect-video w-full rounded-xl bg-black"
        />
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Film className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {value.original_filename ?? value.public_id ?? "Uploaded video"}
          </span>
          {value.bytes != null && (
            <span className="shrink-0 text-muted-foreground/60">
              ({(value.bytes / 1024 / 1024).toFixed(1)} MB)
            </span>
          )}
        </div>
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

  /* ---- Empty / dropzone ---- */
  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50",
        "aspect-video",
        isDragActive && "border-primary bg-secondary",
        className
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            Uploading… {progress}%
          </p>
          <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-card text-primary shadow-soft">
            <Film className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? "Drop the video" : "Click or drag to upload"}
          </p>
          <p className="text-xs text-muted-foreground">
            MP4, WebM, MOV up to 100 MB
          </p>
        </>
      )}
    </div>
  );
}
