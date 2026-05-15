import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
  fastSalesSettings?: string;
  customerAccess?: string;
  allowedPages?: string;
  tenant?: {
    name: string;
    orderMode?: string;
    usedStorageBytes?: number;
    storageLimitBytes?: number;
    planName?: string;
    imageCount?: number;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: (() => { try { return localStorage.getItem("token"); } catch(e) { return null; } })(),
  isInitialized: false,
  login: (user, token) => {
    try { localStorage.setItem("token", token); } catch(e) {}
    set({ user, token });
  },
  logout: () => {
    try { localStorage.removeItem("token"); } catch(e) {}
    set({ user: null, token: null });
  },
  initAuth: async () => {
    const token = get().token;
    console.log("[useAuthStore] initAuth called, token:", token);
    try {
      const headers: any = {};
      if (token && token !== "null" && token !== "undefined") {
        headers.Authorization = `Bearer ${token}`;
      }
      
      console.log("[useAuthStore] fetching /api/auth/me");
      const res = await fetch("/api/auth/me", { headers });
      console.log("[useAuthStore] fetch response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("[useAuthStore] fetch response data:", data);
        set({ user: data.user, isInitialized: true });
      } else {
        const err = await res.text();
        console.log("[useAuthStore] auth failed:", err);
        set({ isInitialized: true });
      }
    } catch (e) {
      console.error("[useAuthStore] fetch error:", e);
      set({ isInitialized: true });
    }
  },
  fetchUser: async () => {
    await get().initAuth();
  }
}));
