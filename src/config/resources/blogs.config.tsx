import { Newspaper } from "lucide-react";
import type { Blog } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import {
  DateCell,
  FeaturedCell,
  MediaCell,
  MutedCell,
  STATUS_OPTIONS,
  StatusCell,
} from "./cells";

export const blogsConfig: ResourceConfig<Blog> = {
  name: "Article",
  titlePlural: "Blogs",
  description: "Publish and manage articles for your website blog.",
  icon: <Newspaper />,
  service: resourceServices.blogs,
  queryKey: "blogs",
  permission: "blogs",
  defaultSort: "published_at",
  formWidth: "xl",
  searchPlaceholder: "Search articles…",
  getRowTitle: (row) => row.title,
  filters: [{ key: "status", label: "Status", options: STATUS_OPTIONS }],
  columns: [
    {
      header: "Article",
      cell: (r) => (
        <MediaCell
          image={r.featured_image}
          title={r.title}
          subtitle={r.category_name ?? r.author_name}
        />
      ),
    },
    { header: "Views", cell: (r) => <MutedCell value={r.views} /> },
    { header: "Status", cell: (r) => <StatusCell value={r.status} /> },
    { header: "Featured", cell: (r) => <FeaturedCell value={r.is_featured} /> },
    { header: "Published", cell: (r) => <DateCell value={r.published_at} /> },
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true, section: "Content", colSpan: 2 },
    { name: "excerpt", label: "Excerpt", type: "textarea", placeholder: "Short summary shown in listings", section: "Content" },
    { name: "content", label: "Content", type: "richtext", placeholder: "Write your article (HTML/Markdown supported)", section: "Content" },
    { name: "author_name", label: "Author", type: "text", section: "Content" },
    { name: "category_name", label: "Category", type: "text", section: "Content" },
    { name: "tags", label: "Tags", type: "tags", section: "Content", placeholder: "Add tag…" },
    { name: "featured_image", label: "Featured image", type: "image", folder: "nupun/blogs", section: "Media" },
    { name: "is_featured", label: "Feature on homepage", type: "switch", section: "Publishing" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "draft", section: "Publishing" },
    { name: "seo.meta_title", label: "Meta title", type: "text", section: "SEO" },
    { name: "seo.meta_description", label: "Meta description", type: "textarea", section: "SEO" },
    { name: "seo.meta_keywords", label: "Meta keywords", type: "tags", section: "SEO", placeholder: "Add keyword…" },
  ],
};
