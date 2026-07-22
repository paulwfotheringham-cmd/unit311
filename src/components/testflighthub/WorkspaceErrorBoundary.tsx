"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { enterpriseButtonClassName, enterpriseCardClassName } from "@/lib/enterprise-ui";
import { cn } from "@/lib/utils";

type WorkspaceErrorBoundaryProps = {
  children: ReactNode;
  /** Shown in the recovery panel heading. */
  title?: string;
  /** Optional compact mode for embedding inside a widget. */
  compact?: boolean;
  className?: string;
  onReset?: () => void;
};

type WorkspaceErrorBoundaryState = {
  error: Error | null;
};

/**
 * Isolates workspace/widget render failures so one broken panel cannot blank
 * the entire Internal Ops dashboard (Next.js "This page couldn't load").
 */
export class WorkspaceErrorBoundary extends Component<
  WorkspaceErrorBoundaryProps,
  WorkspaceErrorBoundaryState
> {
  state: WorkspaceErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WorkspaceErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "[WorkspaceErrorBoundary]",
      this.props.title ?? "workspace",
      error,
      info.componentStack,
    );
  }

  private handleRetry = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const title = this.props.title ?? "This module";
    const detail =
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong while loading this view. You can retry without leaving the dashboard.";

    return (
      <div
        role="alert"
        className={cn(
          enterpriseCardClassName(
            this.props.compact
              ? "flex min-h-[10rem] flex-col items-center justify-center gap-3 text-center"
              : "flex min-h-[16rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center",
          ),
          this.props.className,
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-white">{title} couldn’t load</p>
          <p className="max-w-md text-sm text-white/55">{detail}</p>
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          className={cn(enterpriseButtonClassName("secondary"), "mt-1")}
        >
          Try again
        </button>
      </div>
    );
  }
}

export default WorkspaceErrorBoundary;
