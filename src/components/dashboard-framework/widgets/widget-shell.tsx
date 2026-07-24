import { cn } from "@/lib/utils";

export function widgetShellClass(className?: string) {
  return cn(
    "rounded-[12px] border p-4",
    "border-[color:var(--platform-card-border,#243347)] bg-[color:var(--platform-card,#121C2D)]",
    className,
  );
}

export function WidgetTitle({
  title,
  meta,
}: {
  title?: string;
  meta?: string;
}) {
  if (!title && !meta) return null;
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      {title ? (
        <h3 className="truncate text-[12px] font-semibold tracking-wide text-white/80 uppercase">
          {title}
        </h3>
      ) : (
        <span />
      )}
      {meta ? <span className="shrink-0 text-[11px] text-white/40">{meta}</span> : null}
    </div>
  );
}
