"use client";

import { AlertTriangle } from "lucide-react";

import WorkspaceLoadingFallback from "@/components/testflighthub/WorkspaceLoadingFallback";

type WorkspaceBreadcrumbProps = {
  readonly crumbs: readonly string[];
};

export function WorkspaceBreadcrumb({ crumbs }: WorkspaceBreadcrumbProps) {
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-0.5">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <span className="shrink-0 text-white/25">/</span> : null}
              <span className={isLast ? "truncate text-white/55" : "truncate"}>{crumb}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type WorkspaceLoadingProps = {
  readonly label?: string;
};

export function WorkspaceLoading({ label = "Loading workspace" }: WorkspaceLoadingProps) {
  return <WorkspaceLoadingFallback label={label} />;
}

type WorkspaceEmptyProps = {
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
};

export function WorkspaceEmpty({ title, description, action }: WorkspaceEmptyProps) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
      <p className="text-sm font-semibold text-white/80">{title}</p>
      {description ? <p className="max-w-md text-sm text-white/50">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

type WorkspaceErrorProps = {
  readonly title?: string;
  readonly message: string;
  readonly onRetry?: () => void;
};

export function WorkspaceError({
  title = "Something went wrong",
  message,
  onRetry,
}: WorkspaceErrorProps) {
  return (
    <div
      className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-6 py-10 text-center"
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 text-rose-300" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-rose-100">{title}</p>
        <p className="max-w-md text-sm text-rose-100/70">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
