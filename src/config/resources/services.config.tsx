import { Stethoscope } from "lucide-react";
import type { Service } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import {
  DateCell,
  FeaturedCell,
  MediaCell,
  MutedCell,
  STATUS_OPTIONS,
  StatusCell,
} from "./cells";
import { formatCurrency } from "@/lib/utils";

export const servicesConfig: ResourceConfig<Service> = {
  name: "Service",
  titlePlural: "Services",
  description: "Manage the home-care services offered on your website.",
  icon: <Stethoscope />,
  service: resourceServices.services,
  queryKey: "services",
  permission: "services",
  defaultSort: "order",
  formWidth: "xl",
  searchPlaceholder: "Search services…",
  getRowTitle: (row) => row.title,
  filters: [
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    {
      key: "is_featured",
      label: "Featured",
      options: [
        { label: "Featured", value: "true" },
        { label: "Not featured", value: "false" },
      ],
    },
  ],
  columns: [
    {
      header: "Service",
      cell: (r) => (
        <MediaCell
          image={r.featured_image}
          title={r.title}
          subtitle={r.category_name ?? r.short_description}
        />
      ),
    },
    { header: "Price", cell: (r) => <MutedCell value={r.price ? `${formatCurrency(r.price)} ${r.price_unit ?? ""}` : "—"} /> },
    { header: "Status", cell: (r) => <StatusCell value={r.status} /> },
    { header: "Featured", cell: (r) => <FeaturedCell value={r.is_featured} /> },
    { header: "Updated", cell: (r) => <DateCell value={r.updated_at} /> },
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Home Nursing Care", section: "Basic details", colSpan: 2 },
    { name: "short_description", label: "Short description", type: "textarea", placeholder: "One-line summary shown on cards", section: "Basic details" },
    { name: "description", label: "Full description", type: "richtext", placeholder: "Detailed description of this service", section: "Basic details" },
    { name: "category_name", label: "Category", type: "text", placeholder: "e.g. Nursing", section: "Basic details" },
    { name: "price", label: "Price", type: "number", min: 0, placeholder: "1500", section: "Pricing" },
    { name: "price_unit", label: "Price unit", type: "text", placeholder: "per day / per visit", section: "Pricing" },
    { name: "featured_image", label: "Featured image", type: "image", folder: "nupun/services", section: "Media" },
    { name: "is_featured", label: "Feature on homepage", type: "switch", section: "Visibility" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "published",
      section: "Visibility",
    },
    { name: "order", label: "Display order", type: "number", defaultValue: 0, section: "Visibility" },
    { name: "seo.meta_title", label: "Meta title", type: "text", section: "SEO" },
    { name: "seo.meta_description", label: "Meta description", type: "textarea", section: "SEO" },
    { name: "seo.meta_keywords", label: "Meta keywords", type: "tags", section: "SEO", placeholder: "Add keyword…" },
  ],
};
