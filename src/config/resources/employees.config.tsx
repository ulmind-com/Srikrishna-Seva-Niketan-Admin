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
  // Staff Register shows verified staff only by default; those still under
  // verification live in Staff Verification until approved. Admins can switch
  // the Verification filter to see pending/all.
  defaultFilters: { verification_status: "verified" },
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
        { label: "Other", value: "other" },
      ],
    },
    {
      key: "verification_status",
      label: "Verification",
      options: [
        { label: "Verified Only", value: "verified" },
        { label: "Pending Review", value: "pending" },
      ],
    },
  ],
  columns: [
    {
      header: "Staff",
      cell: (r) => (
        <MediaCell
          image={r.photo}
          title={r.name}
          subtitle={r.code}
          verified={r.verification_status === "verified"}
        />
      ),
    },
    {
      header: "Category",
      cell: (r) => (
        <Badge variant="secondary" className="capitalize">
          {r.category === "other" && r.other_category ? r.other_category : r.category}
        </Badge>
      ),
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
          to={`/employees/${r.id}/documents`}
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
    { name: "email", label: "Email (Optional)", type: "email", section: "Personal", helper: "Optional — enables staff portal mobile app login" },
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
      name: "other_category",
      label: "Specify Other Category / Role",
      type: "text",
      placeholder: "e.g. Ward Boy, Cook, Caregiver",
      section: "Personal",
      showWhen: { field: "category", in: ["other"] },
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
      name: "documents",
      label: "Identity Documents (Aadhaar / Voter / PAN / Others)",
      type: "documents",
      folder: "ssn/employees/id-proof",
      section: "Documents",
      colSpan: 2,
      helper: "Add multiple documents (e.g. Aadhaar, Voter ID, PAN) — each with its number and photo.",
    },
    { name: "photo", label: "Photo (current)", type: "image", folder: "ssn/employees/photos", section: "Documents" },
    { name: "signature", label: "Signature / Thumb Impression", type: "image", folder: "ssn/employees/signatures", section: "Documents" },
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
    {
      name: "join_date",
      label: "Date of Joining (যোগদানের তারিখ)",
      type: "date",
      section: "Employment",
      helper: "Prints as Date of Joining on the staff agreement. Defaults to today if left blank.",
    },
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
