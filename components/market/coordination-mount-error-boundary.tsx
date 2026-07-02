"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type CoordinationMountErrorBoundaryProps = {
  children: ReactNode;
};

type CoordinationMountErrorBoundaryState = {
  failed: boolean;
};

/** Prevent coordination hooks from blanking the whole PWA shell. */
export class CoordinationMountErrorBoundary extends Component<
  CoordinationMountErrorBoundaryProps,
  CoordinationMountErrorBoundaryState
> {
  state: CoordinationMountErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): CoordinationMountErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[coordination-mount]", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}
