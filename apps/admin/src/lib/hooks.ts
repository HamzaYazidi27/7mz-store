"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export function useDashboard() {
  return useQuery({ queryKey: ["admin", "dashboard"], queryFn: async () => (await api.get("/admin/dashboard")).data });
}

export function useAdminList(resource: string, params: Record<string, string | undefined> = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
  return useQuery({
    queryKey: ["admin", resource, params],
    queryFn: async () => (await api.get(`/admin/${resource}?${qs}`)).data,
  });
}

export function useAdminMutation(invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ method, url, body }: { method: "post" | "patch" | "delete"; url: string; body?: unknown }) => {
      if (method === "delete") return (await api.delete(url)).data;
      return (await api[method](url, body)).data;
    },
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: ["admin", k] })),
  });
}
