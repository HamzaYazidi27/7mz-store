import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserDto } from "@7mz/shared";

interface AdminAuthState {
  user: UserDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setAuth: (user: UserDto, tokens: { accessToken: string; refreshToken: string }) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setHydrated: () => void;
  clear: () => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setAuth: (user, tokens) =>
        set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setHydrated: () => set({ hydrated: true }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: "7mz-admin-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
