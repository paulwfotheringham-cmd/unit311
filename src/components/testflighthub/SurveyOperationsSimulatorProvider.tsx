"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import type { FlightProfileId } from "@/lib/flight-simulation";
import type { Telemetry } from "@/lib/telemetry";

import type { FlightHubSandboxHandle } from "./FlightHubSandbox";

type SurveyOperationsSimulatorContextValue = {
  sandboxRef: React.RefObject<FlightHubSandboxHandle | null>;
  liveTelemetry: Telemetry | null;
  isRunning: boolean;
  setSandboxMountTarget: (target: HTMLElement | null) => void;
  setExcludedProfileIds: (ids: FlightProfileId[]) => void;
  setSimulatorEnabled: (enabled: boolean) => void;
};

const SurveyOperationsSimulatorContext =
  createContext<SurveyOperationsSimulatorContextValue | null>(null);

export function useSurveyOperationsSimulator() {
  const context = useContext(SurveyOperationsSimulatorContext);
  if (!context) {
    throw new Error(
      "useSurveyOperationsSimulator must be used within SurveyOperationsSimulatorProvider",
    );
  }
  return context;
}

type SandboxModule = typeof import("./FlightHubSandbox");

function LazySandboxPortal({
  host,
  sandboxRef,
  excludedProfileIds,
  onTelemetryChange,
}: {
  host: HTMLElement;
  sandboxRef: React.RefObject<FlightHubSandboxHandle | null>;
  excludedProfileIds: FlightProfileId[];
  onTelemetryChange: (telemetry: Telemetry | null, running: boolean) => void;
}) {
  const [Sandbox, setSandbox] = useState<SandboxModule["default"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./FlightHubSandbox").then((mod) => {
      if (!cancelled) setSandbox(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Sandbox) return null;

  return createPortal(
    <Sandbox
      ref={sandboxRef}
      onTelemetryChange={onTelemetryChange}
      excludedProfileIds={excludedProfileIds}
    />,
    host,
  );
}

export default function SurveyOperationsSimulatorProvider({ children }: { children: ReactNode }) {
  const sandboxRef = useRef<FlightHubSandboxHandle>(null);
  const hiddenHostRef = useRef<HTMLDivElement>(null);
  const [liveTelemetry, setLiveTelemetry] = useState<Telemetry | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [visibleMountTarget, setVisibleMountTarget] = useState<HTMLElement | null>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [excludedProfileIds, setExcludedProfileIds] = useState<FlightProfileId[]>([]);
  const [simulatorEnabled, setSimulatorEnabled] = useState(false);

  const handleTelemetryChange = useCallback((telemetry: Telemetry | null, running: boolean) => {
    setLiveTelemetry(telemetry);
    setIsRunning(running);
  }, []);

  const setSandboxMountTarget = useCallback((target: HTMLElement | null) => {
    setVisibleMountTarget(target);
  }, []);

  useLayoutEffect(() => {
    if (!simulatorEnabled) {
      setPortalHost(null);
      setLiveTelemetry(null);
      setIsRunning(false);
      return;
    }
    setPortalHost(visibleMountTarget ?? hiddenHostRef.current);
  }, [visibleMountTarget, simulatorEnabled]);

  return (
    <SurveyOperationsSimulatorContext.Provider
      value={{
        sandboxRef,
        liveTelemetry,
        isRunning,
        setSandboxMountTarget,
        setExcludedProfileIds,
        setSimulatorEnabled,
      }}
    >
      {children}
      <div ref={hiddenHostRef} className="hidden" aria-hidden />
      {simulatorEnabled && portalHost ? (
        <LazySandboxPortal
          host={portalHost}
          sandboxRef={sandboxRef}
          excludedProfileIds={excludedProfileIds}
          onTelemetryChange={handleTelemetryChange}
        />
      ) : null}
    </SurveyOperationsSimulatorContext.Provider>
  );
}
