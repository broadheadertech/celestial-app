import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthState } from '@/types';

interface AuthStore extends AuthState {
  // Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  initializeGuestSession: () => void;
  updateGuestId: (guestId: string) => void;
}

// Generate unique guest ID
const generateGuestId = (): string => {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      isAuthenticated: false,
      guestId: undefined,

      // Actions
      login: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          guestId: undefined, // Clear guest session when user logs in
        });
      },

      logout: () => {
        const newGuestId = generateGuestId();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          guestId: newGuestId, // Create new guest session after logout
        });
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      initializeGuestSession: () => {
        const currentState = get();
        if (!currentState.user && !currentState.guestId) {
          set({
            guestId: generateGuestId(),
          });
        }
      },

      updateGuestId: (guestId: string) => {
        set({ guestId });
      },
    }),
    {
      name: 'celestial-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential auth data
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        guestId: state.guestId,
      }),
    }
  )
);

// Utility hooks for common auth checks
export const useIsAdmin = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'admin';
};

export const useIsClient = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'client';
};

export const useCurrentUser = () => {
  return useAuthStore((state) => state.user);
};

export const useIsAuthenticated = () => {
  return useAuthStore((state) => state.isAuthenticated);
};

export const useIsGuest = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const guestId = useAuthStore((state) => state.guestId);
  return !isAuthenticated && !!guestId;
};