import { Link } from "react-router-dom";
import { UserPlus, IdCard } from "lucide-react";
import type { Employee } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { BranchName } from "@/components/common/BranchName";
import { BoolCell, DateCell, MediaCell } from "./cells";
import { branchField } from "./branch-field";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  available: "success",
  assigned: "secondary",
  on_leave: "warning",
  inactive: "danger",
};

export const employeesConfig: ResourceConfig<Employee> = {
  name: "Employee",
  titlePlural: "Staff Register",
  description:
    "Register and manage field staff — nurses, aayas, attendants, physios. Generate printable ID cards.",
  icon: <UserPlus />,
  service: resourceServices.employees,
  queryKey: "employees",
  permission: "employees",
  defaultSort: "created_at",
  formWidth: "xl",
  getRowTitle: (row) => row.name,
  filters: [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Available", value: "available" },
        { label: "Assigned", value: "assigned" },
        { label: "On Leave", value: "on_leave" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    {
      key: "category",
      label: "Category",
      options: [
        { label: "Nurse", value: "nurse" },
        { label: "Aaya", value: "aaya" },
        { label: "Attendant", value: "attendant" },
        { label: "Physio", value: "physio" },
        { label: "Japa", value: "japa" },
        { label: "Other", value: "other" },
      ],
    },
  ],
  columns: [
    {
      header: "Staff",
      cell: (r) => <MediaCell image={r.photo} title={r.name} subtitle={r.code} />,
    },
    {
      header: "Category",
      cell: (r) => <Badge variant="secondary" className="capitalize">{r.category}</Badge>,
    },
    { header: "Phone", cell: (r) => <span className="text-sm">{r.phone}</span> },
    {
      header: "Branch",
      cell: (r) => <BranchName id={r.location_id} className="text-sm" />,
    },
    {
      header: "Status",
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="capitalize">
          {r.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "ID Card",
      cell: (r) => (
        <Link
          to={`/employees/${r.id}/id-card`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <IdCard className="h-3.5 w-3.5" /> View
        </Link>
      ),
    },
    { header: "Active", cell: (r) => <BoolCell value={r.is_active} /> },
    { header: "Updated", cell: (r) => <DateCell value={r.updated_at} /> },
  ],
  fields: [
    { name: "name", label: "Full Name", type: "text", required: true, section: "Personal", colSpan: 2 },
    { name: "phone", label: "Phone", type: "text", required: true, section: "Personal" },
    { name: "alt_phone", label: "Alternate Phone", type: "text", section: "Personal" },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      defaultValue: "nurse",
      options: [
        { label: "Nurse", value: "nurse" },
        { label: "Aaya", value: "aaya" },
        { label: "Attendant", value: "attendant" },
        { label: "Physio", value: "physio" },
        { label: "Japa", value: "japa" },
        { label: "Other", value: "other" },
      ],
      section: "Personal",
    },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
        { label: "Other", value: "other" },
      ],
      section: "Personal",
    },
    { name: "experience", label: "Experience", type: "text", placeholder: "e.g. 3 years", section: "Personal" },
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
    { name: "id_proof", label: "ID Proof Document", type: "image", folder: "ssn/employees/id-proof", section: "Documents" },
    { name: "photo", label: "Photo (current)", type: "image", folder: "ssn/employees/photos", section: "Documents" },
    { name: "signature", label: "Signature", type: "image", folder: "ssn/employees/signatures", section: "Documents" },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "available",
      options: [
        { label: "Available", value: "available" },
        { label: "Assigned", value: "assigned" },
        { label: "On Leave", value: "on_leave" },
        { label: "Inactive", value: "inactive" },
      ],
      section: "Employment",
    },
    { name: "daily_rate", label: "Daily Rate / Payout (₹)", type: "number", min: 0, section: "Employment" },
    { name: "join_date", label: "Join Date", type: "date", section: "Employment" },
    {
      name: "rating",
      label: "Rating",
      type: "select",
      defaultValue: "5",
      options: [
        { label: "5.0", value: "5" },
        { label: "4.5", value: "4.5" },
        { label: "4.0", value: "4" },
        { label: "3.5", value: "3.5" },
        { label: "3.0", value: "3" },
      ],
      section: "Employment",
    },
    { name: "notes", label: "Notes", type: "textarea", section: "Employment", colSpan: 2 },
    { name: "is_active", label: "Active", type: "switch", defaultValue: true, section: "Employment" },
  ],
};
