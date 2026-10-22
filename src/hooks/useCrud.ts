import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { ListParams } from "@/types/api";
import type { CrudService } from "@/services/crud.factory";
import { normalizeError } from "@/services/api/client";

/** Hook factory: returns typed list/detail/mutation hooks for a resource. */
export function makeResourceHooks<T extends { id: string }>(
  key: string,
  service: CrudService<T>
) {
  const listKey = (params?: ListParams) => [key, "list", params ?? {}] as const;
  const detailKey = (id: string) => [key, "detail", id] as const;

  function useList(params?: ListParams) {
    return useQuery({
      queryKey: listKey(params),
      queryFn: () => service.list(params),
      placeholderData: keepPreviousData,
    });
  }

  function useDetail(id: string | undefined) {
    return useQuery({
      queryKey: detailKey(id ?? ""),
      queryFn: () => service.get(id as string),
      enabled: Boolean(id),
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (data: Partial<T>) => service.create(data),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [key] });
        toast.success("Created successfully");
      },
      onError: (err) => toast.error(normalizeError(err).message),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
        service.update(id, data),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [key] });
        toast.success("Updated successfully");
      },
      onError: (err) => toast.error(normalizeError(err).message),
    });
  }

  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => service.remove(id),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [key] });
        toast.success("Deleted successfully");
      },
      onError: (err) => toast.error(normalizeError(err).message),
    });
  }

  return { key, listKey, detailKey, useList, useDetail, useCreate, useUpdate, useRemove };
}
