"use client";

import { useSyncExternalStore } from "react";

import { getHrMockSnapshot, subscribeHrMockStore } from "@/lib/hr-mock-store";

export function useHrMockStore() {
  return useSyncExternalStore(subscribeHrMockStore, getHrMockSnapshot, getHrMockSnapshot);
}
