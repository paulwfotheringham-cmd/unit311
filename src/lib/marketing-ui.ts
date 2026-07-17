export const MARKETING_PATHS = [
  "/about",
  "/faq",
  "/contact",
  "/signup",
  "/login",
  "/security",
  "/termsandconditions",
  "/privacypolicy",
  "/book",
  "/payment",
  "/payment-card",
  "/payment-transfer",
] as const;

export function isMarketingRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return MARKETING_PATHS.includes(pathname as (typeof MARKETING_PATHS)[number]);
}

export const MARKETING_CONTENT_CLASS =
  "relative z-10 mx-auto w-full max-w-[1400px] px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-16 lg:px-10 lg:py-20";

export const marketingEyebrow =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#93c5fd] sm:text-xs sm:tracking-[0.28em]";

export const marketingPageTitle =
  "text-[1.5rem] font-bold leading-[1.12] tracking-[-0.03em] text-white sm:text-[2.5rem] sm:leading-[1.08] lg:text-[2.75rem]";

export const marketingPageIntro =
  "mt-5 text-[15px] leading-relaxed text-white/70 sm:text-[17px]";

export const marketingSectionTitle =
  "text-2xl font-bold tracking-tight text-white sm:text-3xl";

export const marketingCard =
  "rounded-2xl border border-white/12 bg-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:border-white/18";

export const marketingCardLarge =
  "rounded-[28px] border border-white/12 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-md";

export const marketingFormShell =
  "rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.12] to-white/[0.05] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.4)] backdrop-blur-md sm:rounded-[28px] sm:p-5 lg:rounded-[32px] lg:p-6";

export const marketingBtnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0b2d63] transition-colors hover:bg-white/90";

export const marketingBtnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10";

export const marketingBtnGreen =
  "inline-flex h-11 items-center justify-center rounded-lg bg-[#15803d] px-7 text-[15px] font-semibold text-white shadow-[0_2px_12px_rgba(21,128,61,0.35)] transition-colors hover:bg-[#166534]";

export const marketingBtnSubmit =
  "inline-flex w-full items-center justify-center rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_32px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60";

export const marketingInputLabel = "mb-1.5 block text-sm font-medium text-white/80";

export const marketingInput =
  "w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:opacity-60";

export const marketingLegalH2 = "text-lg font-semibold text-white";

export const marketingLegalP = "mt-3 text-[15px] leading-relaxed text-white/72";

export const marketingLegalLink =
  "font-medium text-[#93c5fd] transition-colors hover:text-[#bfdbfe] hover:underline";

export const marketingFadeIn = "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both";
