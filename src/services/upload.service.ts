import { endpoints } from "./api/endpoints";
import { apiRequest } from "./api/client";
import type { FileAsset, ImageAsset } from "@/types/models";

/** Upload helpers targeting the backend Cloudinary endpoints. */
export const uploadService = {
  image: (file: File, folder = "nupun/images") => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    return apiRequest<ImageAsset>({
      method: "POST",
      url: endpoints.uploads.image,
      data: form,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  file: (file: File, folder = "nupun/files") => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    return apiRequest<FileAsset>({
      method: "POST",
      url: endpoints.uploads.file,
      data: form,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  video: (file: File, folder = "nupun/videos") => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    return apiRequest<FileAsset>({
      method: "POST",
      url: endpoints.uploads.video,
      data: form,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  remove: (public_id: string, resource_type: "image" | "video" | "raw" = "image") =>
    apiRequest<{ deleted: boolean }>({
      method: "DELETE",
      url: endpoints.uploads.root,
      params: { public_id, resource_type },
    }),
};
