"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type GlobeErrorBoundaryProps = {
  children: ReactNode;
};

type GlobeErrorBoundaryState = {
  error: Error | null;
};

export class GlobeErrorBoundary extends Component<
  GlobeErrorBoundaryProps,
  GlobeErrorBoundaryState
> {
  state: GlobeErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GlobeErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[globe-boundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rimvio-globe-space rimvio-globe-space--toss flex min-h-[50dvh] flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-[#191f28]">
            지구를 불러오지 못했어요
          </p>
          <p className="max-w-xs text-[14px] leading-relaxed text-[#8b95a1]">
            새로고침 후 다시 시도해 주세요. 계속되면 앱을 한 번 닫았다가 다시 열어 주세요.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="rounded-full bg-[#191f28] px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
