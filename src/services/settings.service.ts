import { endpoints } from "./api/endpoints";
import { http } from "./api/http";
import type { SEOSettings, SocialLinks, WebsiteSettings } from "@/types/models";

export const settingsService = {
  getWebsite: () => http.get<WebsiteSettings>(endpoints.settings.website),
  updateWebsite: (data: Partial<WebsiteSettings>) =>
    http.put<WebsiteSettings>(endpoints.settings.website, data),

  getSocial: () => http.get<SocialLinks>(endpoints.settings.social),
  updateSocial: (data: Partial<SocialLinks>) =>
    http.put<SocialLinks>(endpoints.settings.social, data),

  listSeo: () => http.get<SEOSettings[]>(endpoints.settings.seoAll),
  upsertSeo: (data: Partial<SEOSettings> & { page_key: string }) =>
    http.put<SEOSettings>(endpoints.settings.seo, data),
};
