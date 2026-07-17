"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { TreasuryNotification } from "@/lib/treasury/treasury-types";

type Toast = {
  id: string;
  title: string;
  message: string;
};

type TreasuryContextValue = {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  notifications: TreasuryNotification[];
  setNotifications: (items: TreasuryNotification[]) => void;
};

const TreasuryContext = createContext<TreasuryContextValue | null>(null);

export function TreasuryProvider({
  children,
  initialNotifications = [],
}: {
  children: React.ReactNode;
  initialNotifications?: TreasuryNotification[];
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] =
    useState<TreasuryNotification[]>(initialNotifications);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast, notifications, setNotifications }),
    [toasts, pushToast, dismissToast, notifications],
  );

  return <TreasuryContext.Provider value={value}>{children}</TreasuryContext.Provider>;
}

export function useTreasuryContext() {
  const context = useContext(TreasuryContext);
  if (!context) throw new Error("TreasuryProvider is required.");
  return context;
}
