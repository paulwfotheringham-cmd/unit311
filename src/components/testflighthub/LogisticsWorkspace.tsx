"use client";

/**
 * Logistics module entry gate (MOD-092).
 *
 * PHASE 1 ENTRY FLOW — FROZEN (2026-07-19)
 * See docs/platform-architecture/MOD-092-PHASE1-ENTRY-FLOW-FREEZE.md
 *
 * Development behaviour (temporary, approved):
 * Open Logistics → ONLY Setup Wizard (full content area).
 * Dashboard is NOT mounted until Finish / Skip / Open Logistics.
 * Wizard shows on every Logistics open (fresh mount via parent key).
 *
 * Next work: operational features (Create Shipment, Details, Lifecycle, …)
 * — not further onboarding changes.
 */

import { useState } from "react";

import LogisticsDashboard from "./LogisticsDashboard";
import LogisticsSetupWizard from "./LogisticsSetupWizard";
import LogisticsShippingProvidersPage from "./LogisticsShippingProvidersPage";

type LogisticsPhase = "wizard" | "app";
type LogisticsAppPage = "dashboard" | "providers";

export default function LogisticsWorkspace() {
  const [phase, setPhase] = useState<LogisticsPhase>("wizard");
  const [appPage, setAppPage] = useState<LogisticsAppPage>("dashboard");
  const [showAddProviderWizard, setShowAddProviderWizard] = useState(false);

  // Entry: wizard only — do not mount dashboard behind it.
  if (phase === "wizard") {
    return (
      <div className="min-h-[min(70vh,52rem)] w-full">
        <LogisticsSetupWizard
          onOpenLogistics={() => {
            setAppPage("dashboard");
            setShowAddProviderWizard(false);
            setPhase("app");
          }}
        />
      </div>
    );
  }

  // Add Provider flow (from Shipping Providers page) — still no dashboard underneath.
  if (showAddProviderWizard) {
    return (
      <div className="min-h-[min(70vh,52rem)] w-full">
        <LogisticsSetupWizard
          onOpenLogistics={() => {
            setShowAddProviderWizard(false);
            setAppPage("providers");
          }}
        />
      </div>
    );
  }

  if (appPage === "providers") {
    return (
      <LogisticsShippingProvidersPage
        onBack={() => setAppPage("dashboard")}
        onAddProvider={() => setShowAddProviderWizard(true)}
        onContinueSetup={() => setShowAddProviderWizard(true)}
      />
    );
  }

  return (
    <LogisticsDashboard onManageProviders={() => setAppPage("providers")} />
  );
}
