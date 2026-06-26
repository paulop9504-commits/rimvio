"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { copy } from "@/lib/copy/human-ko";

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

type State = {
  error: Error | null;
};

/** Field sheet must not take down Globe home when scoring or trade rows throw. */
export class OpportunityFieldErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[field-sheet]", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <p className="text-[17px] font-semibold text-[#191f28]">
            {copy.globe.field.sheetTitle}
          </p>
          <p className="text-[14px] leading-relaxed text-[#8b95a1]">
            {copy.globe.field.actionUnavailable}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-2 rounded-full bg-[#191f28] px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
