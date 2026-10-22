import type { ListParams, Paginated } from "@/types/api";
import { http } from "./api/http";

/** Build a standard CRUD service bound to a REST resource endpoint. */
export function createCrudService<
  T,
  CreateDTO = Partial<T>,
  UpdateDTO = Partial<T>,
>(baseUrl: string) {
  return {
    baseUrl,
    list: (params?: ListParams) => http.list<T>(baseUrl, params),
    get: (id: string) => http.get<T>(`${baseUrl}/${id}`),
    create: (data: CreateDTO) => http.post<T>(baseUrl, data),
    update: (id: string, data: UpdateDTO) => http.put<T>(`${baseUrl}/${id}`, data),
    remove: (id: string) => http.del<null>(`${baseUrl}/${id}`),
  };
}

export type CrudService<T, C = Partial<T>, U = Partial<T>> = ReturnType<
  typeof createCrudService<T, C, U>
>;

export type { Paginated };
