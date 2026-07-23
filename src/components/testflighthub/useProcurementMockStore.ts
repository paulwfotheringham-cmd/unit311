"use client";

import { useSyncExternalStore } from "react";

import {
  getProcurementMockSnapshot,
  subscribeProcurementMockStore,
} from "@/lib/procurement-mock-store";

export function useProcurementMockStore() {
  return useSyncExternalStore(
    subscribeProcurementMockStore,
    getProcurementMockSnapshot,
    getProcurementMockSnapshot,
  );
}
