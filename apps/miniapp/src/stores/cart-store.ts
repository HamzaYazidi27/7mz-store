import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductCardDto } from "@7mz/shared";

export interface CartLine {
  product: ProductCardDto;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: ProductCardDto, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

/**
 * Cart store — persisted client-side cart. Checkout reads these lines to build
 * the order payload; the server re-prices authoritatively at order time.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.product.id === product.id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.product.id === product.id
                  ? { ...l, quantity: Math.min(99, l.quantity + quantity) }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { product, quantity }] };
        }),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.product.id !== productId)
              : state.lines.map((l) =>
                  l.product.id === productId ? { ...l, quantity: Math.min(99, quantity) } : l,
                ),
        })),

      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.product.id !== productId) })),

      clear: () => set({ lines: [] }),

      itemCount: () => get().lines.reduce((n, l) => n + l.quantity, 0),

      subtotal: () =>
        Math.round(
          get().lines.reduce((s, l) => s + Number.parseFloat(l.product.price) * l.quantity, 0) * 100,
        ) / 100,
    }),
    {
      name: "7mz-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
