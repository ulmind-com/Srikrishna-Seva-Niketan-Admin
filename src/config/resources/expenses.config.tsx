import { Wallet } from "lucide-react";
import type { Expense } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { BranchName } from "@/components/common/BranchName";
import { DateCell } from "./cells";
import { branchField } from "./branch-field";

export const expensesConfig: ResourceConfig<Expense> = {
  name: "Expense",
  titlePlural: "Expenses",
  description: "Record firm operating expenses. These feed the profit & loss report.",
  icon: <Wallet />,
  service: resourceServices.expenses,
  queryKey: "expenses",
  permission: "expenses",
  defaultSort: "date",
  formWidth: "md",
  getRowTitle: (row) => row.category,
  columns: [
    {
      header: "Category",
      cell: (r) => <Badge variant="secondary" className="capitalize">{r.category}</Badge>,
    },
    {
      header: "Amount",
      cell: (r) => <span className="font-medium">₹{r.amount.toLocaleString()}</span>,
    },
    { header: "Date", cell: (r) => <DateCell value={r.date} /> },
    { header: "Branch", cell: (r) => <BranchName id={r.location_id} className="text-sm" /> },
    { header: "Note", cell: (r) => <span className="text-sm text-muted-foreground">{r.note || "—"}</span> },
  ],
  fields: [
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: [
        { label: "Salary / Payout", value: "salary" },
        { label: "Rent", value: "rent" },
        { label: "Transport", value: "transport" },
        { label: "Marketing", value: "marketing" },
        { label: "Utilities", value: "utilities" },
        { label: "Supplies", value: "supplies" },
        { label: "Miscellaneous", value: "misc" },
      ],
      section: "Details",
    },
    { name: "amount", label: "Amount (₹)", type: "number", required: true, min: 0, section: "Details" },
    { name: "date", label: "Date", type: "date", section: "Details" },
    branchField(),
    { name: "note", label: "Note", type: "textarea", section: "Details", colSpan: 2 },
  ],
};
