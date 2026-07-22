import { useQuery } from "@tanstack/react-query";
import type { HomeFeedDto } from "@7mz/shared";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Home feed — a single aggregated request powering the entire home screen:
 * banners, announcements, categories, featured / flash-sale / best-seller
 * rails and the unread notification count.
 */
export function useHomeFeed() {
  const status = useAuthStore((s) => s.status);

  return useQuery<HomeFeedDto>({
    queryKey: ["home-feed"],
    queryFn: async () => (await api.get<HomeFeedDto>("/home")).data,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}
