/** Standard response envelope returned by the FastAPI backend. */
export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors: ApiFieldError[] | Record<string, unknown> | null;
}

export interface ApiFieldError {
  field: string;
  message: string;
  type?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Common query params accepted by list endpoints. */
export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  source?: string;
  [key: string]: string | number | boolean | undefined;
}
