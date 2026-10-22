import { Users, Star } from "lucide-react";
import type { StaffMember } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { BoolCell, DateCell, FeaturedCell, MediaCell } from "./cells";

export const staffConfig: ResourceConfig<StaffMember> = {
  name: "Staff Member",
  titlePlural: "Our Staff",
  description: "Manage staff members — attendants, nurses, physiotherapists, nannies & japa.",
  icon: <Users />,
  service: resourceServices.staff,
  queryKey: "staff",
  permission: "staff",
  defaultSort: "order",
  formWidth: "lg",
  getRowTitle: (row) => row.name,
  filters: [
    {
      key: "is_active",
      label: "Status",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
  ],
  columns: [
    {
      header: "Staff",
      cell: (r) => (
        <MediaCell image={r.photo} title={r.name} subtitle={r.service_label} />
      ),
    },
    {
      header: "Category",
      cell: (r) => <Badge variant="secondary" className="capitalize">{r.category}</Badge>,
    },
    {
      header: "Rating",
      cell: (r) => (
        <div className="flex items-center gap-0.5 text-warning">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i < Math.round(r.rating) ? "fill-current" : "text-muted-foreground/30"}`}
            />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">{r.rating}</span>
        </div>
      ),
    },
    {
      header: "Pricing (₹)",
      cell: (r) => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {r.price_7_days != null && <div>7d: ₹{r.price_7_days.toLocaleString()}</div>}
          {r.price_15_days != null && <div>15d: ₹{r.price_15_days.toLocaleString()}</div>}
          {r.price_30_days != null && <div>30d: ₹{r.price_30_days.toLocaleString()}</div>}
        </div>
      ),
    },
    { header: "Active", cell: (r) => <BoolCell value={r.is_active} /> },
    { header: "Featured", cell: (r) => <FeaturedCell value={r.is_featured} /> },
    { header: "Updated", cell: (r) => <DateCell value={r.updated_at} /> },
  ],
  fields: [
    { name: "name", label: "Full Name", type: "text", required: true, section: "Details", colSpan: 2 },
    { name: "category", label: "Category", type: "text", required: true, placeholder: "e.g. Health Attendant, Nurse, Physiotherapist", section: "Details" },
    {
      name: "order",
      label: "Order (tab position)",
      type: "number",
      defaultValue: 0,
      min: 0,
      section: "Details",
      helper: "Lower number shows first on the website. The category whose staff has the smallest order becomes the 1st tab (1 = first, 2 = second, and so on).",
    },
    { name: "service_label", label: "Service Label", type: "text", placeholder: "e.g. 24 hours Health Attendant", section: "Details", colSpan: 2 },
    {
      name: "rating",
      label: "Rating",
      type: "select",
      options: [
        { label: "5.0", value: "5" },
        { label: "4.5", value: "4.5" },
        { label: "4.0", value: "4" },
        { label: "3.5", value: "3.5" },
        { label: "3.0", value: "3" },
      ],
      defaultValue: "5",
      section: "Details",
    },
    { name: "experience", label: "Experience", type: "text", placeholder: "e.g. 3 years", section: "Details" },
    { name: "bio", label: "Bio / Description", type: "textarea", section: "Details" },
    { name: "photo", label: "Photo", type: "image", folder: "nupun/staff", section: "Media" },
    { name: "price_7_days", label: "Price — 7 Days (₹)", type: "number", section: "Pricing" },
    { name: "price_15_days", label: "Price — 15 Days (₹)", type: "number", section: "Pricing" },
    { name: "price_30_days", label: "Price — 30 Days (₹)", type: "number", section: "Pricing" },
    { name: "is_featured", label: "Featured", type: "switch", section: "Visibility" },
    { name: "is_active", label: "Active", type: "switch", defaultValue: true, section: "Visibility" },
  ],
};
