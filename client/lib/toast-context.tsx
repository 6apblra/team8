import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { ToastBanner, ToastData } from "@/components/ToastBanner";

interface ToastContextType {
  showToast: (toast: Omit<ToastData, "id">) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((data: Omit<ToastData, "id">) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = Date.now().toString();
    setToast({ ...data, id });
    timerRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastBanner toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
