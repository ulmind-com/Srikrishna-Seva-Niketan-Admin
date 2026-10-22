import { HelpCircle, Quote, Star, Video as VideoIcon } from "lucide-react";
import type { FAQ, Testimonial, Video } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { BoolCell, DateCell, FeaturedCell, MediaCell, MutedCell } from "./cells";

/* ---------------- Videos ---------------- */
export const videosConfig: ResourceConfig<Video> = {
  name: "Video",
  titlePlural: "Videos",
  description: "Curate YouTube and hosted videos for your website gallery.",
  icon: <VideoIcon />,
  service: resourceServices.videos,
  queryKey: "videos",
  permission: "videos",
  defaultSort: "order",
  formWidth: "lg",
  getRowTitle: (row) => row.title,
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
      header: "Video",
      cell: (r) => (
        <MediaCell image={r.thumbnail} title={r.title} subtitle={r.category} />
      ),
    },
    {
      header: "Source",
      cell: (r) => <Badge variant="secondary" className="capitalize">{r.source}</Badge>,
    },
    { header: "Active", cell: (r) => <BoolCell value={r.is_active} /> },
    { header: "Featured", cell: (r) => <FeaturedCell value={r.is_featured} /> },
    { header: "Updated", cell: (r) => <DateCell value={r.updated_at} /> },
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true, section: "Details", colSpan: 2 },
    { name: "description", label: "Description", type: "textarea", section: "Details" },
    { name: "category", label: "Category", type: "text", section: "Details" },
    {
      name: "source",
      label: "Source",
      type: "select",
      options: [
        { label: "YouTube", value: "youtube" },
        { label: "Cloudinary", value: "cloudinary" },
      ],
      defaultValue: "youtube",
      section: "Details",
    },
    { name: "youtube_url", label: "YouTube URL", type: "text", placeholder: "https://youtube.com/watch?v=…", section: "Details", colSpan: 2 },
    { name: "video_file", label: "Video File", type: "video", folder: "nupun/videos", section: "Media", helper: "Upload a video when Source is Cloudinary" },
    { name: "thumbnail", label: "Thumbnail", type: "image", folder: "nupun/videos", section: "Media" },
    { name: "is_featured", label: "Featured", type: "switch", section: "Visibility" },
    { name: "is_active", label: "Active", type: "switch", defaultValue: true, section: "Visibility" },
    { name: "order", label: "Order", type: "number", defaultValue: 0, section: "Visibility" },
  ],
};

/* ---------------- Testimonials ---------------- */
export const testimonialsConfig: ResourceConfig<Testimonial> = {
  name: "Testimonial",
  titlePlural: "Testimonials",
  description: "Showcase patient and client testimonials.",
  icon: <Quote />,
  service: resourceServices.testimonials,
  queryKey: "testimonials",
  permission: "testimonials",
  defaultSort: "order",
  formWidth: "lg",
  getRowTitle: (row) => row.patient_name,
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
      header: "Patient",
      cell: (r) => (
        <MediaCell image={r.photo} title={r.patient_name} subtitle={r.designation} />
      ),
    },
    {
      header: "Rating",
      cell: (r) => (
        <div className="flex items-center gap-0.5 text-warning">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "text-muted-foreground/30"}`}
            />
          ))}
        </div>
      ),
    },
    {
      header: "Message",
      cell: (r) => (
        <p className="line-clamp-1 max-w-xs text-sm text-muted-foreground">
          {r.message}
        </p>
      ),
    },
    { header: "Active", cell: (r) => <BoolCell value={r.is_active} /> },
    { header: "Featured", cell: (r) => <FeaturedCell value={r.is_featured} /> },
  ],
  fields: [
    { name: "patient_name", label: "Patient name", type: "text", required: true, section: "Details" },
    { name: "designation", label: "Designation", type: "text", section: "Details" },
    { name: "message", label: "Testimonial", type: "textarea", required: true, section: "Details" },
    {
      name: "rating",
      label: "Rating",
      type: "select",
      options: [5, 4, 3, 2, 1].map((n) => ({ label: `${n} Stars`, value: String(n) })),
      defaultValue: "5",
      section: "Details",
    },
    { name: "photo", label: "Photo", type: "image", folder: "nupun/testimonials", section: "Media" },
    { name: "is_featured", label: "Featured", type: "switch", section: "Visibility" },
    { name: "is_active", label: "Active", type: "switch", defaultValue: true, section: "Visibility" },
    { name: "order", label: "Order", type: "number", defaultValue: 0, section: "Visibility" },
  ],
};

/* ---------------- FAQ ---------------- */
export const faqsConfig: ResourceConfig<FAQ> = {
  name: "FAQ",
  titlePlural: "FAQ",
  description: "Manage frequently asked questions and answers.",
  icon: <HelpCircle />,
  service: resourceServices.faqs,
  queryKey: "faqs",
  permission: "faqs",
  defaultSort: "order",
  formWidth: "lg",
  getRowTitle: (row) => row.question,
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
      header: "Question",
      cell: (r) => (
        <div className="max-w-md">
          <p className="truncate font-medium text-foreground">{r.question}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{r.answer}</p>
        </div>
      ),
    },
    { header: "Category", cell: (r) => <MutedCell value={r.category} /> },
    { header: "Order", cell: (r) => <MutedCell value={r.order} /> },
    { header: "Active", cell: (r) => <BoolCell value={r.is_active} /> },
  ],
  fields: [
    { name: "question", label: "Question", type: "text", required: true, section: "Details", colSpan: 2 },
    { name: "answer", label: "Answer", type: "textarea", required: true, section: "Details" },
    { name: "category", label: "Category", type: "text", section: "Details" },
    { name: "is_active", label: "Active", type: "switch", defaultValue: true, section: "Visibility" },
    { name: "order", label: "Order", type: "number", defaultValue: 0, section: "Visibility" },
  ],
};
