import { create } from "zustand";

interface CustomerUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  username?: string;
  tenantId: string;
}

interface CustomerAuthState {
  customer: CustomerUser | null;
  token: string | null;
  isInitialized: boolean;
  login: (customer: CustomerUser, token: string) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

const STORAGE_KEY = "customer_token";

export const useCustomerAuthStore = create<CustomerAuthState>((set, get) => ({
  customer: null,
  token: (() => { try { return localStorage.getItem(STORAGE_KEY); } catch(e) { return null; } })(),
  isInitialized: false,

  login: (customer, token) => {
    try { localStorage.setItem(STORAGE_KEY, token); } catch(e) {}
    set({ customer, token });
  },

  logout: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
    set({ customer: null, token: null });
  },

  initAuth: async () => {
    const token = get().token;
    if (!token || token === "null" || token === "undefined") {
      set({ isInitialized: true });
      return;
    }
    try {
      const res = await fetch("/api/auth/customer/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ customer: data.customer, isInitialized: true });
      } else {
        try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
        set({ customer: null, token: null, isInitialized: true });
      }
    } catch (e) {
      set({ isInitialized: true });
    }
  }
}));
