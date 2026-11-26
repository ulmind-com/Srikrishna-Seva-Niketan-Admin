import { Contact, FileSignature } from "lucide-react";
import { Link } from "react-router-dom";
import type { Customer } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { BranchName } from "@/components/common/BranchName";
import { BoolCell, DateCell } from "./cells";
import { branchField } from "./branch-field";

const CARE_LABEL: Record<string, string> = {
  home: "Home",
  nursing_home: "Nursing Home",
  hospital: "Hospital",
};

export const customersConfig: ResourceConfig<Customer> = {
  name: "Customer",
  titlePlural: "Customers",
  description:
    "Register and manage clients who need staff — home, nursing-home and hospital care.",
  icon: <Contact />,
  service: resourceServices.customers,
  queryKey: "customers",
  permission: "customers",
  defaultSort: "created_at",
  formWidth: "xl",
  getRowTitle: (row) => row.name,
  filters: [
    {
      key: "care_type",
      label: "Care Type",
      options: [
        { label: "Home", value: "home" },
        { label: "Nursing Home", value: "nursing_home" },
        { label: "Hospital", value: "hospital" },
      ],
    },
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
      header: "Customer",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{r.code}</span>
        </div>
      ),
    },
    { header: "Phone", cell: (r) => <span className="text-sm">{r.phone}</span> },
    {
      header: "Care Type",
      cell: (r) => (
        <Badge variant="secondary">{CARE_LABEL[r.care_type] ?? r.care_type}</Badge>
      ),
    },
    {
      header: "Branch",
      cell: (r) => <BranchName id={r.location_id} className="text-sm" />,
    },
    {
      header: "Agreement",
      cell: (r) => (
        <Link
          to={`/customers/${r.id}/agreement`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <FileSignature className="h-3.5 w-3.5" /> Generate
        </Link>
      ),
    },
    { header: "Active", cell: (r) => <BoolCell value={r.is_active} /> },
    { header: "Updated", cell: (r) => <DateCell value={r.updated_at} /> },
  ],
  fields: [
    { name: "name", label: "Full Name", type: "text", required: true, section: "Details", colSpan: 2 },
    { name: "phone", label: "Phone", type: "text", required: true, section: "Details" },
    { name: "alt_phone", label: "Alternate Phone", type: "text", section: "Details" },
    {
      name: "care_type",
      label: "Care Type",
      type: "select",
      required: true,
      defaultValue: "home",
      options: [
        { label: "Home", value: "home" },
        { label: "Nursing Home", value: "nursing_home" },
        { label: "Hospital", value: "hospital" },
      ],
      section: "Details",
    },
    {
      name: "purpose",
      label: "Purpose (কী উদ্দেশ্যে / কারণ)",
      type: "text",
      placeholder: "e.g. Post-surgery recovery, Elderly care",
      section: "Details",
      helper: "Shown next to Care Type on the Service Agreement.",
    },
    {
      name: "agreement_date",
      label: "Service Agreement Date (এগ্রিমেন্টের তারিখ)",
      type: "date",
      section: "Details",
      helper: "Select from calendar — prints on the customer's Service Agreement.",
    },
    { name: "service_label", label: "Service Required", type: "text", placeholder: "e.g. 24 hrs Health Attendant", section: "Details" },
    { name: "duration_days", label: "Duration (days)", type: "number", min: 0, section: "Details" },
    { name: "billing_rate", label: "Contract Amount (₹)", type: "number", min: 0, helper: "Agreed service charges / contract amount (e.g. 13500).", section: "Details" },
    branchField(),
    { name: "address", label: "Address", type: "textarea", section: "Address", colSpan: 2 },
    { name: "city", label: "City", type: "text", section: "Address" },
    { name: "pincode", label: "Pincode", type: "text", section: "Address" },
    {
      name: "documents",
      label: "Identity Documents (Aadhaar / Voter / PAN / Others)",
      type: "documents",
      folder: "ssn/customers/id-proof",
      section: "Documents",
      colSpan: 2,
      helper: "Add multiple documents (e.g. Aadhaar, Voter ID, PAN) — each with its number and photo.",
    },
    { name: "notes", label: "Notes", type: "textarea", section: "Documents", colSpan: 2 },
    { name: "is_active", label: "Active", type: "switch", defaultValue: true, section: "Documents" },
  ],
};
