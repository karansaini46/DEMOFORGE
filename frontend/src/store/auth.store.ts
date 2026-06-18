import { create } from 'zustand';

import { getMe } from '../api/auth.api';
import { TOKEN_KEY, USER_KEY } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'FREE' | 'PRO';
  monthlyUsage: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  initAuth: () => void;
  refreshUser: () => Promise<void>;
}

/** Safely parse the persisted user blob; returns null on any corruption. */
function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  initAuth: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = readStoredUser();
    if (token && user) {
      set({ token, user, isAuthenticated: true });
      // Refresh from the server in the background to pick up the live
      // monthlyUsage/plan (login/register responses omit monthlyUsage).
      void useAuthStore.getState().refreshUser();
    } else {
      set({ token: null, user: null, isAuthenticated: false });
    }
  },

  refreshUser: async () => {
    // Skip if there's no session; a 401 here is handled by the axios interceptor.
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const { user } = await getMe();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      // Leave the hydrated state in place; interceptor clears on 401.
    }
  },
}));
