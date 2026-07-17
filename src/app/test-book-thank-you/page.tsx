import type { Metadata } from "next";

import { Suspense } from "react";

import TestBookThankYouContent from "@/components/book/TestBookThankYouContent";
import MarketingPageShell from "@/components/layout/MarketingPageShell";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Booking Thank You Preview",
  description: "Preview layout for the Unit311 Central booking thank-you page.",
  path: "/test-book-thank-you",
});

export default function TestBookThankYouPage() {
  return (
    <MarketingPageShell
      backgroundImage="/images/bluesky.jpg"
      backgroundImageClassName="object-cover object-[center_35%] sm:object-center"
      overlayClassName="absolute inset-0 bg-gradient-to-b from-[#020617]/35 via-[#020617]/20 to-[#020617]/50"
      contentClassName="relative z-10 mx-auto max-w-[1100px] px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-8 sm:pb-24 lg:px-10 lg:pb-28"
    >
      <Suspense fallback={null}>
        <TestBookThankYouContent />
      </Suspense>
    </MarketingPageShell>
  );
}
