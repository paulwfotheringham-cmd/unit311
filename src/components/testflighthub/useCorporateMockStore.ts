"use client";

import { useSyncExternalStore } from "react";

import {
  getCorporateMockSnapshot,
  subscribeCorporateMockStore,
} from "@/lib/corporate-mock-store";

export function useCorporateMockStore() {
  return useSyncExternalStore(
    subscribeCorporateMockStore,
    getCorporateMockSnapshot,
    getCorporateMockSnapshot,
  );
}
