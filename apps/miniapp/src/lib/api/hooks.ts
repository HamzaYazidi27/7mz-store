"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  BannerDto,
  CategoryDto,
  CheckoutQuoteDto,
  CreateOrderResultDto,
  CursorPaginated,
  DailyRewardStateDto,
  HelpArticleDto,
  LeaderboardEntryDto,
  MissionDto,
  NotificationDto,
  OrderDetailDto,
  OrderDto,
  PaymentMethodDto,
  ProductCardDto,
  ProductDetailDto,
  ProductReviewsSummaryDto,
  ReferralStatsDto,
  ReviewDto,
  SpinResultDto,
  SpinStateDto,
  TicketDetailDto,
  TicketDto,
  TransactionDto,
  UserStatsDto,
  WalletDto,
} from "@7mz/shared";
import { api } from "./client";
import { useAuthStore } from "@/stores/auth-store";

const authed = () => useAuthStore.getState().status === "authenticated";

// ----------------------------------------------------------------- catalog

export interface ProductFilters {
  search?: string;
  category?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
}

export function useProducts(filters: ProductFilters) {
  const status = useAuthStore((s) => s.status);
  return useInfiniteQuery({
    queryKey: ["products", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
      if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
      if (filters.inStock) params.set("inStock", "true");
      if (filters.onSale) params.set("onSale", "true");
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", "12");
      const { data } = await api.get<CursorPaginated<ProductCardDto>>(`/products?${params}`);
      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: status === "authenticated",
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<CategoryDto[]>("/categories")).data,
    enabled: authed(),
    staleTime: 300_000,
  });
}

export function useProduct(slug: string) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => (await api.get<ProductDetailDto>(`/products/${slug}`)).data,
    enabled: status === "authenticated" && !!slug,
  });
}

export function useRelatedProducts(slug: string) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["product", slug, "related"],
    queryFn: async () => (await api.get<ProductCardDto[]>(`/products/${slug}/related`)).data,
    enabled: status === "authenticated" && !!slug,
  });
}

export function useReviews(slug: string) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["product", slug, "reviews"],
    queryFn: async () =>
      (
        await api.get<CursorPaginated<ReviewDto> & { summary: ProductReviewsSummaryDto }>(
          `/products/${slug}/reviews`,
        )
      ).data,
    enabled: status === "authenticated" && !!slug,
  });
}

// ------------------------------------------------------------- checkout

export function useCheckoutQuote(
  items: { productId: string; quantity: number }[],
  couponCode?: string,
) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["checkout-quote", items, couponCode ?? ""],
    queryFn: async () =>
      (await api.post<CheckoutQuoteDto>("/orders/quote", { items, couponCode })).data,
    enabled: status === "authenticated" && items.length > 0,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      items: { productId: string; quantity: number }[];
      couponCode?: string;
      provider: string;
      asset?: string;
    }) => (await api.post<CreateOrderResultDto>("/orders", body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// --------------------------------------------------------------- orders

export function useOrders(status: string) {
  const authStatus = useAuthStore((s) => s.status);
  return useInfiniteQuery({
    queryKey: ["orders", status],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (pageParam) params.set("cursor", pageParam);
      const { data } = await api.get<CursorPaginated<OrderDto>>(`/orders?${params}`);
      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: authStatus === "authenticated",
  });
}

export function useOrder(id: string, opts?: { refetchInterval?: number }) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await api.get<OrderDetailDto>(`/orders/${id}`)).data,
    enabled: status === "authenticated" && !!id,
    refetchInterval: opts?.refetchInterval,
  });
}

// --------------------------------------------------------------- wallet

export function useWallet() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => (await api.get<WalletDto>("/wallet")).data,
    enabled: status === "authenticated",
  });
}

export function useTransactions() {
  const status = useAuthStore((s) => s.status);
  return useInfiniteQuery({
    queryKey: ["transactions"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      const { data } = await api.get<CursorPaginated<TransactionDto>>(`/wallet/transactions?${params}`);
      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: status === "authenticated",
  });
}

export function useDepositMethods() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["deposit-methods"],
    queryFn: async () => (await api.get<PaymentMethodDto[]>("/wallet/deposit-methods")).data,
    enabled: status === "authenticated",
  });
}

export function useDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { amount: number; provider: string; asset?: string }) =>
      (await api.post("/wallet/deposit", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
  });
}

export function useRedeemPromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => (await api.post("/wallet/promo", { code })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// --------------------------------------------------------------- profile

export function useMe() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/users/me")).data,
    enabled: status === "authenticated",
  });
}

export function useUserStats() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["me", "stats"],
    queryFn: async () => (await api.get<UserStatsDto>("/users/me/stats")).data,
    enabled: status === "authenticated",
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.patch("/users/me", body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["me"] });
      useAuthStore.getState().setUser(data as never);
    },
  });
}

// --------------------------------------------------------------- growth

export function useReferralStats() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["referrals"],
    queryFn: async () => (await api.get<ReferralStatsDto>("/referrals/stats")).data,
    enabled: status === "authenticated",
  });
}

export function useLeaderboard() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["referrals", "leaderboard"],
    queryFn: async () => (await api.get<LeaderboardEntryDto[]>("/referrals/leaderboard")).data,
    enabled: status === "authenticated",
  });
}

export function useMissions() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["missions"],
    queryFn: async () => (await api.get<MissionDto[]>("/missions")).data,
    enabled: status === "authenticated",
  });
}

export function useClaimMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/missions/${id}/claim`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useDailyReward() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["rewards", "daily"],
    queryFn: async () => (await api.get<DailyRewardStateDto>("/rewards/daily")).data,
    enabled: status === "authenticated",
  });
}

export function useClaimDaily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/rewards/daily/claim")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", "daily"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useSpinState() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["rewards", "spin"],
    queryFn: async () => (await api.get<SpinStateDto>("/rewards/spin")).data,
    enabled: status === "authenticated",
  });
}

export function useSpin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<SpinResultDto>("/rewards/spin")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", "spin"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// -------------------------------------------------------- notifications

export function useNotifications() {
  const status = useAuthStore((s) => s.status);
  return useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      const { data } = await api.get<CursorPaginated<NotificationDto>>(`/notifications?${params}`);
      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: status === "authenticated",
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/notifications/read-all")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}

// --------------------------------------------------------------- support

export function useTickets() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["tickets"],
    queryFn: async () => (await api.get<TicketDto[]>("/tickets")).data,
    enabled: status === "authenticated",
  });
}

export function useTicket(id: string) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => (await api.get<TicketDetailDto>(`/tickets/${id}`)).data,
    enabled: status === "authenticated" && !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { subject: string; message: string; orderId?: string }) =>
      (await api.post<TicketDetailDto>("/tickets", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useReplyTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await api.post(`/tickets/${id}/reply`, { body })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", id] }),
  });
}

export function useHelpArticles(query?: string) {
  return useQuery({
    queryKey: ["help", query ?? ""],
    queryFn: async () =>
      (await api.get<HelpArticleDto[]>(`/help/articles${query ? `?q=${encodeURIComponent(query)}` : ""}`)).data,
  });
}
