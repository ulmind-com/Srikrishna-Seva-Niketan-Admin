import { Contact } from "lucide-react";
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
      header: "1-to-1",
      cell: (r) => <BoolCell value={r.one_to_one} />,
    },
    {
      header: "Branch",
      cell: (r) => <BranchName id={r.location_id} className="text-sm" />,
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
    { name: "service_label", label: "Service Required", type: "text", placeholder: "e.g. 24 hrs Health Attendant", section: "Details" },
    { name: "duration_days", label: "Duration (days)", type: "number", min: 0, section: "Details" },
    { name: "billing_rate", label: "Billing Rate (₹)", type: "number", min: 0, helper: "Amount charged to the customer.", section: "Details" },
    { name: "one_to_one", label: "One-to-one (dedicated staff)", type: "switch", defaultValue: true, section: "Details" },
    branchField(),
    { name: "address", label: "Address", type: "textarea", section: "Address", colSpan: 2 },
    { name: "city", label: "City", type: "text", section: "Address" },
    { name: "pincode", label: "Pincode", type: "text", section: "Address" },
    {
      name: "id_proof_type",
      label: "ID Proof Type",
      type: "select",
      options: [
        { label: "Aadhaar", value: "Aadhaar" },
        { label: "Voter ID", value: "Voter ID" },
        { label: "PAN", value: "PAN" },
        { label: "Driving License", value: "Driving License" },
        { label: "Passport", value: "Passport" },
      ],
      section: "Documents",
    },
    { name: "id_proof_number", label: "ID Proof Number", type: "text", section: "Documents" },
    { name: "id_proof", label: "ID Proof Document", type: "image", folder: "ssn/customers/id-proof", section: "Documents" },
    { name: "notes", label: "Notes", type: "textarea", section: "Documents", colSpan: 2 },
    { name: "is_active", label: "Active", type: "switch", defaultValue: true, section: "Documents" },
  ],
};
