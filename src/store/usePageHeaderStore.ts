import { ReactNode } from "react";
import { create } from "zustand";

interface PageHeaderAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  to?: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
  disabled?: boolean;
}

interface PageHeaderState {
  title: string | null;
  subtitle?: string | null;
  backTo?: string | null;
  onBack?: (() => void) | null;
  actions: PageHeaderAction[];
  setHeader: (header: Omit<PageHeaderState, "setHeader" | "resetHeader">) => void;
  resetHeader: () => void;
}

export const usePageHeaderStore = create<PageHeaderState>((set) => ({
  title: null,
  subtitle: null,
  backTo: null,
  actions: [],
  setHeader: (header) => set(header),
  resetHeader: () => set({ title: null, subtitle: null, backTo: null, onBack: null, actions: [] }),
}));
