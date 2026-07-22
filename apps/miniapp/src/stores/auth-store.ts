import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserDto } from "@7mz/shared";

export type AuthStatus = "booting" | "authenticated" | "guest" | "error";

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: AuthStatus;

  setAuth: (user: UserDto, tokens: { accessToken: string; refreshToken: string }) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: UserDto) => void;
  patchUser: (patch: Partial<UserDto>) => void;
  setBalance: (balance: string) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

/**
 * Auth store — access token lives in memory only; the refresh token and the
 * user snapshot persist across reopenings for instant warm boots.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: "booting",

      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          status: "authenticated",
        }),

      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),

      setUser: (user) => set({ user }),

      patchUser: (patch) =>
        set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),

      setBalance: (balance) =>
        set((state) => ({ user: state.user ? { ...state.user, balance } : state.user })),

      setStatus: (status) => set({ status }),

      clear: () =>
        set({ user: null, accessToken: null, refreshToken: null, status: "guest" }),
    }),
    {
      name: "7mz-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);
