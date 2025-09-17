import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product } from '@/types';

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotalAmount: () => number;
  getItemById: (productId: string) => CartItem | undefined;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      addItem: (product: Product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.productId === product._id);

          if (existingItem) {
            // Update existing item quantity
            return {
              items: state.items.map(item =>
                item.productId === product._id
                  ? { ...item, quantity: item.quantity + quantity, updatedAt: Date.now() }
                  : item
              ),
              error: null,
            };
          } else {
            // Add new item
            const newItem: CartItem = {
              productId: product._id,
              quantity,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              product, // Include product data for easy access
            };
            return {
              items: [...state.items, newItem],
              error: null,
            };
          }
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter(item => item.productId !== productId),
          error: null,
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map(item =>
            item.productId === productId
              ? { ...item, quantity, updatedAt: Date.now() }
              : item
          ),
          error: null,
        }));
      },

      clearCart: () => {
        set({
          items: [],
          error: null,
        });
      },

      getItemCount: () => {
        const items = get().items;
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalAmount: () => {
        const items = get().items;
        return items.reduce((total, item) => {
          const price = item.product?.price || 0;
          return total + (price * item.quantity);
        }, 0);
      },

      getItemById: (productId: string) => {
        const items = get().items;
        return items.find(item => item.productId === productId);
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'celestial-cart-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist all cart data
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

// Utility hooks for cart functionality
export const useCartItemCount = () => {
  return useCartStore((state) => state.getItemCount());
};

export const useCartTotal = () => {
  return useCartStore((state) => state.getTotalAmount());
};

export const useCartItems = () => {
  return useCartStore((state) => state.items);
};