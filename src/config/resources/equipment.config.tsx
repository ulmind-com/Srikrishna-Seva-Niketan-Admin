import { Package } from "lucide-react";
import type { Equipment } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import {
  BoolCell,
  DateCell,
  MediaCell,
  MutedCell,
  STATUS_OPTIONS,
  StatusCell,
} from "./cells";
import { formatCurrency } from "@/lib/utils";

export const equipmentConfig: ResourceConfig<Equipment> = {
  name: "Equipment",
  titlePlural: "Medical Equipment",
  description: "Manage rentable and purchasable medical equipment inventory.",
  icon: <Package />,
  service: resourceServices.equipment,
  queryKey: "equipment",
  permission: "equipment",
  defaultSort: "order",
  formWidth: "xl",
  searchPlaceholder: "Search equipment…",
  getRowTitle: (row) => row.name,
  filters: [
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    {
      key: "is_available",
      label: "Availability",
      options: [
        { label: "Available", value: "true" },
        { label: "Unavailable", value: "false" },
      ],
    },
  ],
  columns: [
    {
      header: "Equipment",
      cell: (r) => (
        <MediaCell
          image={r.featured_image}
          title={r.name}
          subtitle={r.category_name ?? r.short_description}
        />
      ),
    },
    {
      header: "Rental",
      cell: (r) => (
        <MutedCell
          value={r.rental_price ? `${formatCurrency(r.rental_price)} ${r.rental_unit}` : "—"}
        />
      ),
    },
    { header: "Stock", cell: (r) => <MutedCell value={r.stock} /> },
    { header: "Available", cell: (r) => <BoolCell value={r.is_available} /> },
    { header: "Status", cell: (r) => <StatusCell value={r.status} /> },
    { header: "Updated", cell: (r) => <DateCell value={r.updated_at} /> },
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Hospital Bed", section: "Basic details", colSpan: 2 },
    { name: "short_description", label: "Short description", type: "textarea", section: "Basic details" },
    { name: "description", label: "Description", type: "richtext", section: "Basic details" },
    { name: "category_name", label: "Category", type: "text", placeholder: "e.g. Mobility", section: "Basic details" },
    { name: "rental_price", label: "Rental price", type: "number", min: 0, section: "Pricing" },
    { name: "rental_unit", label: "Rental unit", type: "text", defaultValue: "per day", section: "Pricing" },
    { name: "security_deposit", label: "Security deposit", type: "number", min: 0, section: "Pricing" },
    { name: "stock", label: "Stock quantity", type: "number", min: 0, defaultValue: 0, section: "Inventory" },
    { name: "is_available", label: "Available for rent", type: "switch", defaultValue: true, section: "Inventory" },
    { name: "featured_image", label: "Featured image", type: "image", folder: "nupun/equipment", section: "Media" },
    { name: "is_featured", label: "Feature on homepage", type: "switch", section: "Visibility" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "published", section: "Visibility" },
    { name: "order", label: "Display order", type: "number", defaultValue: 0, section: "Visibility" },
  ],
};
