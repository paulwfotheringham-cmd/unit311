"use client";

import { useCallback, useEffect, useState } from "react";

import TreasuryShell from "@/components/treasury/TreasuryShell";
import type { WiseConnectionStatus } from "@/lib/wise-service";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 160) || "Unexpected server response");
  }
}

export default function WiseWorkspace() {
  const [status, setStatus] = useState<WiseConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const statusResponse = await fetch("/api/financials/wise/status", { cache: "no-store" });
      const statusData = await readApiJson<WiseConnectionStatus & { error?: string }>(statusResponse);
      if (!statusResponse.ok) {
        throw new Error(statusData.error ?? "Failed to check Wise connection.");
      }
      setStatus(statusData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load Wise data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus("initial");
  }, [loadStatus]);

  return (
    <TreasuryShell
      status={status}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => void loadStatus("refresh")}
      isAdmin
    />
  );
}
