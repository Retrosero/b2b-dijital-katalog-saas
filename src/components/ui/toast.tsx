import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Convenience methods
export function useToastActions() {
  const { showToast } = useToast();
  return useMemo(() => ({
    success: (title: string, message?: string) => showToast({ type: "success", title, message }),
    error: (title: string, message?: string) => showToast({ type: "error", title, message }),
    warning: (title: string, message?: string) => showToast({ type: "warning", title, message }),
    info: (title: string, message?: string) => showToast({ type: "info", title, message }),
  }), [showToast]);
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-emerald-50 border-emerald-200",
    iconBgColor: "bg-emerald-500",
    iconColor: "text-white",
    textColor: "text-emerald-800",
    titleColor: "text-emerald-900",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-50 border-red-200",
    iconBgColor: "bg-red-500",
    iconColor: "text-white",
    textColor: "text-red-800",
    titleColor: "text-red-900",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-50 border-amber-200",
    iconBgColor: "bg-amber-500",
    iconColor: "text-white",
    textColor: "text-amber-800",
    titleColor: "text-amber-900",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50 border-blue-200",
    iconBgColor: "bg-blue-500",
    iconColor: "text-white",
    textColor: "text-blue-800",
    titleColor: "text-blue-900",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t: Toast) => {
        const handleDismiss = () => onDismiss(t.id);
        return <ToastItem key={t.id} toast={t} onDismiss={handleDismiss} />;
      })}
    </div>
  );
}

type ToastItemProps = { key?: string; toast: Toast; onDismiss: () => void };

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl shadow-lg border animate-slide-in-right pointer-events-auto",
        config.bgColor
      )}
    >
      <div className={cn("shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5", config.iconBgColor)}>
        <Icon className={cn("w-4 h-4", config.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-bold text-sm", config.titleColor)}>{toast.title}</p>
        {toast.message && (
          <p className={cn("text-xs mt-0.5 leading-relaxed", config.textColor)}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}

// Re-export utils if needed
export { cn };
