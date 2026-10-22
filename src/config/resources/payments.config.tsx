import { Receipt } from "lucide-react";
import type { Payment } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { BranchName } from "@/components/common/BranchName";
import { DateCell } from "./cells";
import { loadCustomerOptions } from "./branch-field";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  paid: "success",
  partial: "warning",
  pending: "danger",
};

export const paymentsConfig: ResourceConfig<Payment> = {
  name: "Payment",
  titlePlural: "Payments",
  description: "Record customer payments and track dues (feeds the customer payment report).",
  icon: <Receipt />,
  service: resourceServices.payments,
  queryKey: "payments",
  permission: "payments",
  defaultSort: "date",
  formWidth: "md",
  getRowTitle: (row) => row.customer_name,
  filters: [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Paid", value: "paid" },
        { label: "Partial", value: "partial" },
        { label: "Pending", value: "pending" },
      ],
    },
  ],
  columns: [
    { header: "Customer", cell: (r) => <span className="font-medium">{r.customer_name}</span> },
    {
      header: "Amount",
      cell: (r) => <span className="font-medium">₹{r.amount.toLocaleString()}</span>,
    },
    {
      header: "Mode",
      cell: (r) => <Badge variant="outline" className="uppercase">{r.mode.replace("_", " ")}</Badge>,
    },
    {
      header: "Status",
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
    { header: "Date", cell: (r) => <DateCell value={r.date} /> },
    { header: "Branch", cell: (r) => <BranchName id={r.location_id} className="text-sm" /> },
  ],
  fields: [
    {
      name: "customer_id",
      label: "Customer",
      type: "select",
      required: true,
      placeholder: "Select customer…",
      dynamicOptions: { queryKey: "customer-options", fetch: loadCustomerOptions },
      section: "Details",
    },
    { name: "amount", label: "Amount (₹)", type: "number", required: true, min: 0, section: "Details" },
    {
      name: "mode",
      label: "Payment Mode",
      type: "select",
      defaultValue: "cash",
      options: [
        { label: "Cash", value: "cash" },
        { label: "UPI", value: "upi" },
        { label: "Bank Transfer", value: "bank_transfer" },
        { label: "Card", value: "card" },
        { label: "Cheque", value: "cheque" },
        { label: "Other", value: "other" },
      ],
      section: "Details",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "paid",
      options: [
        { label: "Paid", value: "paid" },
        { label: "Partial", value: "partial" },
        { label: "Pending", value: "pending" },
      ],
      section: "Details",
    },
    { name: "date", label: "Date", type: "date", section: "Details" },
    { name: "note", label: "Note", type: "textarea", section: "Details", colSpan: 2 },
  ],
};
