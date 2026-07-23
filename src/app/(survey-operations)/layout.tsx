import type { Metadata } from "next";

import SurveyOperationsSimulatorProvider from "@/components/testflighthub/SurveyOperationsSimulatorProvider";

export const metadata: Metadata = {
  title: "Unit311 Operations",
  description: "Private Unit311 operations workspace.",
  robots: { index: false, follow: false },
};

export default function SurveyOperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none bg-[#020617] text-white supports-[height:100dvh]:h-dvh safe-area-pt">
      <SurveyOperationsSimulatorProvider>{children}</SurveyOperationsSimulatorProvider>
    </div>
  );
}
