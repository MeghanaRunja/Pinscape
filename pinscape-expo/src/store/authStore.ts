import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User { username: string; profileImage?: string; }

interface AuthState {
  token: string | null;
  user: User | null;
  pintConnected: boolean;
  setToken: (t: string) => void;
  setUser: (u: User) => void;
  setPintConnected: (v: boolean) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  pintConnected: false,

  setToken: (token) => {
    set({ token, pintConnected: true });
    SecureStore.setItemAsync('pinscape_token', token);
  },
  setUser: (user) => {
    set({ user });
    SecureStore.setItemAsync('pinscape_user', JSON.stringify(user));
  },
  setPintConnected: (v) => set({ pintConnected: v }),
  logout: () => {
    set({ token: null, user: null, pintConnected: false });
    SecureStore.deleteItemAsync('pinscape_token');
    SecureStore.deleteItemAsync('pinscape_user');
  },
  hydrate: async () => {
    const [token, userRaw] = await Promise.all([
      SecureStore.getItemAsync('pinscape_token'),
      SecureStore.getItemAsync('pinscape_user'),
    ]);
    if (token) set({ token, pintConnected: true });
    if (userRaw) { try { set({ user: JSON.parse(userRaw) }); } catch {} }
  },
}));
