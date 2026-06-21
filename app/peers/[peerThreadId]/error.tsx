"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";
import { RimvioLogo } from "@/components/rimvio-logo";

type PeerThreadErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

type PeerThreadErrorBoundaryProps = {
  children: ReactNode;
};

type PeerThreadErrorBoundaryState = {
  error: Error | null;
};

function PeerThreadErrorFallback({ error, reset }: PeerThreadErrorProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <RimvioLogo size="md" appearance="dark" />
      <div className="max-w-sm space-y-2">
        <h1 className="text-[17px] font-semibold text-foreground">
          대화를 불러오지 못했어요
        </h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          새로고침 후 다시 시도해 주세요.
        </p>
        {error.message ? (
          <p className="font-mono text-[10px] text-muted-foreground/70">
            {error.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground"
        >
          새로고침
        </button>
        <Link
          href="/peers"
          className="rounded-full border border-border px-5 py-2.5 text-[14px] font-semibold text-foreground"
        >
          친구로
        </Link>
      </div>
    </div>
  );
}

export default function PeerThreadError({ error, reset }: PeerThreadErrorProps) {
  return <PeerThreadErrorFallback error={error} reset={reset} />;
}

export class PeerThreadErrorBoundary extends Component<
  PeerThreadErrorBoundaryProps,
  PeerThreadErrorBoundaryState
> {
  state: PeerThreadErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PeerThreadErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[peer-thread-boundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <PeerThreadErrorFallback
          error={this.state.error}
          reset={() => {
            this.setState({ error: null });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}
