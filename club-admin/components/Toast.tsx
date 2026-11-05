"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MaterialIcon } from "@/components/dashboard-design";

type ToastContextValue = {
  /** Show a short confirmation. Errors belong in an ErrorBanner, not here. */
  notify: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), 2600);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 rounded-xl border border-drift-border bg-drift-surface py-[11px] pl-[11px] pr-3.5 text-[12px] font-semibold text-drift-text-primary shadow-[0_14px_40px_rgb(0_0_0/18%)] transition-all duration-[250ms] ${
          visible ? "translate-y-0 opacity-100" : "translate-y-[15px] opacity-0"
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-drift-primary-light text-drift-primary">
          <MaterialIcon name="check_circle" className="text-[17px]" />
        </span>
        {message}
      </div>
    </ToastContext.Provider>
  );
}
