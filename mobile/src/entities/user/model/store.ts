import { create } from 'zustand';
import { User } from './types';
import { secureStorage, TOKEN_KEYS } from '@/shared/lib/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // true by default while checking secure storage on app launch

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  logout: async () => {
    // Note: We don't call the backend logout endpoint here to maintain FSD purity.
    // The actual "auth-by-email" feature handles the backend call, then calls this to clear state.
    await secureStorage.removeItem(TOKEN_KEYS.ACCESS);
    await secureStorage.removeItem(TOKEN_KEYS.REFRESH);
    set({ user: null, isAuthenticated: false });
  },
}));
