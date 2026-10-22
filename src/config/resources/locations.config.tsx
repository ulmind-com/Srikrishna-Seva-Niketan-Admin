import { Building2, MapPin } from "lucide-react";
import type { Location } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { BoolCell, DateCell } from "./cells";

export const locationsConfig: ResourceConfig<Location> = {
  name: "Branch",
  titlePlural: "Branches / Locations",
  description:
    "Manage the agency's branch offices. Staff, customers and assignments are scoped to a branch.",
  icon: <Building2 />,
  service: resourceServices.locations,
  queryKey: "locations",
  permission: "locations",
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
      header: "Branch",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{r.code}</span>
        </div>
      ),
    },
    {
      header: "Location",
      cell: (r) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{[r.city, r.pincode].filter(Boolean).join(" · ") || "—"}</span>
        </div>
      ),
    },
    {
      header: "Phone",
      cell: (r) => <span className="text-sm">{r.phone || "—"}</span>,
    },
    {
      header: "Active",
      cell: (r) => <BoolCell value={r.is_active} />,
    },
    { header: "Updated", cell: (r) => <DateCell value={r.updated_at} /> },
  ],
  fields: [
    { name: "name", label: "Branch Name", type: "text", required: true, placeholder: "e.g. Salt Lake Branch", section: "Details", colSpan: 2 },
    { name: "code", label: "Branch Code", type: "text", placeholder: "Auto-generated if blank (e.g. SSN-KOL-4F2A)", section: "Details", helper: "Leave blank to auto-generate a unique code." },
    { name: "phone", label: "Phone", type: "text", placeholder: "e.g. +91 98xxxxxxxx", section: "Details" },
    { name: "email", label: "Email", type: "email", section: "Details" },
    { name: "address", label: "Address", type: "textarea", section: "Address", colSpan: 2 },
    { name: "city", label: "City", type: "text", section: "Address" },
    { name: "pincode", label: "Pincode", type: "text", section: "Address" },
    { name: "order", label: "Order", type: "number", defaultValue: 0, min: 0, section: "Visibility", helper: "Lower number shows first." },
    { name: "is_active", label: "Active", type: "switch", defaultValue: true, section: "Visibility" },
  ],
};
