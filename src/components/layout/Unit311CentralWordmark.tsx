import { cn } from "@/lib/utils";

type WordmarkVariant = "hero" | "nav" | "menu";

type Unit311CentralWordmarkProps = {
  variant?: WordmarkVariant;
  className?: string;
};

const VARIANTS: Record<
  WordmarkVariant,
  { root: string; primary: string; secondary: string; line: string }
> = {
  hero: {
    root: "h-[2.75rem] sm:h-[4.5rem] lg:h-[7.0625rem]",
    primary: "text-[1.25rem] sm:text-[2rem] lg:text-[3.125rem]",
    secondary: "text-[0.375rem] sm:text-[0.5625rem] lg:text-[0.9375rem]",
    line: "w-[1rem] sm:w-[1.5rem] lg:w-[2.375rem]",
  },
  nav: {
    root: "h-8 sm:h-12 lg:h-[5.625rem]",
    primary: "text-[0.9375rem] sm:text-[1.375rem] lg:text-[2.5rem]",
    secondary: "text-[0.5rem] sm:text-[0.6875rem] lg:text-[0.8125rem]",
    line: "w-2.5 sm:w-4 lg:w-[2.125rem]",
  },
  menu: {
    root: "h-11 sm:h-12",
    primary: "text-[1.25rem] sm:text-[1.375rem]",
    secondary: "text-[0.5625rem] sm:text-[0.625rem]",
    line: "w-3.5 sm:w-4",
  },
};

export default function Unit311CentralWordmark({
  variant = "nav",
  className,
}: Unit311CentralWordmarkProps) {
  const styles = VARIANTS[variant];

  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-col items-start justify-center leading-none",
        styles.root,
        className,
      )}
      aria-hidden
    >
      <p className={cn("font-black tracking-[-0.04em] text-white", styles.primary)}>
        <span className="text-white">UNIT</span>
        <span className="text-[#2563eb]">311</span>
      </p>

      <div
        className={cn(
          "mt-[0.18em] flex max-w-full items-center gap-[0.45em] self-center",
          styles.secondary,
        )}
      >
        <span
          className={cn(
            "inline-block h-px shrink-0 bg-gradient-to-r from-[#2563eb] via-[#60a5fa] to-white/90",
            styles.line,
          )}
        />
        <span className="font-bold tracking-[0.24em] text-white">CENTRAL</span>
        <span
          className={cn(
            "inline-block h-px shrink-0 bg-gradient-to-l from-[#2563eb] via-[#60a5fa] to-white/90",
            styles.line,
          )}
        />
      </div>
    </div>
  );
}
