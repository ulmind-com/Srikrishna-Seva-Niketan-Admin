import { Briefcase } from "lucide-react";
import type { CareerJob } from "@/types/models";
import { createCrudService } from "@/services/crud.factory";
import { endpoints } from "@/services/api/endpoints";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { DateCell, MutedCell, STATUS_OPTIONS, StatusCell } from "./cells";
import { humanize } from "@/lib/utils";

const jobsService = createCrudService<CareerJob>(endpoints.careers.root);

const JOB_TYPES = [
  { label: "Full-time", value: "full_time" },
  { label: "Part-time", value: "part_time" },
  { label: "Contract", value: "contract" },
  { label: "Internship", value: "internship" },
  { label: "Temporary", value: "temporary" },
];

export const careersConfig: ResourceConfig<CareerJob> = {
  name: "Job",
  titlePlural: "Careers",
  description: "Create and manage job postings for your organisation.",
  icon: <Briefcase />,
  service: jobsService,
  queryKey: "careers",
  permission: "careers",
  defaultSort: "order",
  formWidth: "xl",
  getRowTitle: (row) => row.title,
  filters: [{ key: "status", label: "Status", options: STATUS_OPTIONS }],
  columns: [
    {
      header: "Position",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.title}</p>
          <p className="text-xs text-muted-foreground">
            {r.location ?? "Remote"} · {humanize(r.job_type)}
          </p>
        </div>
      ),
    },
    {
      header: "Type",
      cell: (r) => (
        <Badge variant="secondary">{humanize(r.job_type)}</Badge>
      ),
    },
    { header: "Vacancies", cell: (r) => <MutedCell value={r.vacancies} /> },
    { header: "Status", cell: (r) => <StatusCell value={r.status} /> },
    { header: "Updated", cell: (r) => <DateCell value={r.updated_at} /> },
  ],
  fields: [
    { name: "title", label: "Job title", type: "text", required: true, section: "Details", colSpan: 2 },
    { name: "category_name", label: "Category", type: "text", section: "Details" },
    { name: "location", label: "Location", type: "text", placeholder: "e.g. Kolkata", section: "Details" },
    { name: "job_type", label: "Job type", type: "select", options: JOB_TYPES, defaultValue: "full_time", section: "Details" },
    { name: "experience", label: "Experience", type: "text", placeholder: "e.g. 2-4 years", section: "Details" },
    { name: "salary_range", label: "Salary range", type: "text", placeholder: "e.g. ₹20k - ₹35k", section: "Details" },
    { name: "vacancies", label: "Vacancies", type: "number", defaultValue: 1, min: 1, section: "Details" },
    { name: "description", label: "Description", type: "richtext", section: "Description" },
    { name: "responsibilities", label: "Responsibilities", type: "tags", placeholder: "Add responsibility…", section: "Description" },
    { name: "requirements", label: "Requirements", type: "tags", placeholder: "Add requirement…", section: "Description" },
    { name: "is_featured", label: "Featured", type: "switch", section: "Visibility" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "published", section: "Visibility" },
    { name: "order", label: "Order", type: "number", defaultValue: 0, section: "Visibility" },
  ],
};
