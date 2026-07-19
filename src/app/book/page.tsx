import type { Metadata } from "next";

import BookPageContent from "@/components/book/BookPageContent";
import MarketingPageShell from "@/components/layout/MarketingPageShell";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Book a free intro and demo session",
  description:
    "Schedule a free intro and demo session with Unit311 Central. Choose a weekday slot in your timezone and receive confirmation by email.",
  path: "/book",
});

export default function BookPage() {
  return (
    <MarketingPageShell
      backgroundImage="/images/bluesky.jpg"
      backgroundImageClassName="object-cover object-[center_35%] sm:object-center"
      overlayClassName="absolute inset-0 bg-gradient-to-b from-[#020617]/35 via-[#020617]/20 to-[#020617]/50"
      contentClassName="relative z-10 mx-auto max-w-[1100px] px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-8 sm:pb-24 lg:px-10 lg:pb-28"
    >
      <BookPageContent />
    </MarketingPageShell>
  );
}
