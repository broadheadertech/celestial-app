import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SiteCartLine {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  qty: number;
  stock: number;
  image?: string;
  categoryId?: string;
  categoryName?: string;
  /** Live arowanas reserve with 20% deposit; gear pays in full. */
  isLive: boolean;
}

interface SiteCartStore {
  items: SiteCartLine[];
  isOpen: boolean;
  add: (item: Omit<SiteCartLine, 'qty'>, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

export const useSiteCart = create<SiteCartStore>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      add: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((l) => l.productId === item.productId);
          if (existing && !item.isLive) {
            return {
              isOpen: true,
              items: state.items.map((l) =>
                l.productId === item.productId
                  ? { ...l, qty: Math.min(l.qty + qty, l.stock || 999) }
                  : l,
              ),
            };
          }
          if (existing && item.isLive) return { isOpen: true };
          return {
            isOpen: true,
            items: [...state.items, { ...item, qty: 1 }],
          };
        }),

      remove: (productId) =>
        set((state) => ({
          items: state.items.filter((l) => l.productId !== productId),
        })),

      setQty: (productId, qty) =>
        set((state) => ({
          items: state.items
            .map((l) => (l.productId === productId ? { ...l, qty: Math.min(qty, l.stock || 999) } : l))
            .filter((l) => l.qty > 0),
        })),

      clear: () => set({ items: [] }),

      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: 'dragons-cave-site-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Helpers consumed by checkout / drawer
export const siteCartSubtotal = (items: SiteCartLine[]) =>
  items.reduce((s, l) => s + l.price * l.qty, 0);

export const siteCartLiveItems = (items: SiteCartLine[]) => items.filter((l) => l.isLive);
export const siteCartGearItems = (items: SiteCartLine[]) => items.filter((l) => !l.isLive);

export const siteCartDepositToday = (items: SiteCartLine[]) => {
  const live = siteCartLiveItems(items).reduce((s, l) => s + l.price * 0.2, 0);
  const gear = siteCartGearItems(items).reduce((s, l) => s + l.price * l.qty, 0);
  return live + gear;
};

export const siteCartBalanceAtPickup = (items: SiteCartLine[]) =>
  siteCartLiveItems(items).reduce((s, l) => s + l.price * 0.8, 0);
