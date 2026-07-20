"use client";

/**
 * Detached compose island — own React root under document.body.
 * Parent PromptFrame/PinBar can storm-reconcile without touching IME.
 */

import { createRoot, type Root } from "react-dom/client";
import {
  GlobeContextConditionComposeInput,
  type GlobeContextConditionComposeInputHandle,
} from "@/components/globe/globe-context-condition-compose-input";
import { createRef } from "react";

type IslandProps = {
  busy: boolean;
  placeholder: string;
  submitLabel: string;
  onSubmit: () => void;
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let slot: HTMLElement | null = null;
let props: IslandProps | null = null;
let resizeObserver: ResizeObserver | null = null;
const handleRef = createRef<GlobeContextConditionComposeInputHandle>();

function syncHostBox(): void {
  if (!host || !slot) {
    return;
  }
  const rect = slot.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) {
    host.style.visibility = "hidden";
    host.style.pointerEvents = "none";
    return;
  }
  host.style.visibility = "visible";
  host.style.pointerEvents = "auto";
  host.style.position = "fixed";
  host.style.left = `${rect.left}px`;
  host.style.top = `${rect.top}px`;
  host.style.width = `${rect.width}px`;
  host.style.height = `${Math.max(rect.height, 40)}px`;
  host.style.zIndex = "90";
  host.style.boxSizing = "border-box";
}

function renderIsland(): void {
  if (!root || !props) {
    return;
  }
  root.render(
    <GlobeContextConditionComposeInput
      ref={handleRef}
      busy={props.busy}
      placeholder={props.placeholder}
      submitLabel={props.submitLabel}
      onSubmit={props.onSubmit}
      className="h-full"
    />,
  );
}

function onViewportChange(): void {
  syncHostBox();
}

function disposeIslandHost(): void {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener("resize", onViewportChange);
  window.visualViewport?.removeEventListener("resize", onViewportChange);
  window.visualViewport?.removeEventListener("scroll", onViewportChange);
  try {
    root?.unmount();
  } catch {
    // ignore double-unmount after hydration recovery
  }
  root = null;
  host?.remove();
  host = null;
  slot = null;
  props = null;
}

export function mountGlobeComposeIsland(
  slotEl: HTMLElement,
  next: IslandProps,
): void {
  // Always remount cleanly — orphan hosts after #418 remount broke the composer.
  if (host || root) {
    disposeIslandHost();
  }

  slot = slotEl;
  props = next;

  host = document.createElement("div");
  host.setAttribute("data-globe-compose-island-host", "true");
  document.body.appendChild(host);
  root = createRoot(host);
  window.addEventListener("resize", onViewportChange);
  window.visualViewport?.addEventListener("resize", onViewportChange);
  window.visualViewport?.addEventListener("scroll", onViewportChange);

  resizeObserver = new ResizeObserver(() => syncHostBox());
  resizeObserver.observe(slotEl);

  syncHostBox();
  renderIsland();
}

export function updateGlobeComposeIsland(partial: Partial<IslandProps>): void {
  if (!props || !root) {
    return;
  }
  const next = { ...props, ...partial };
  const busyChanged = next.busy !== props.busy;
  const copyChanged =
    next.placeholder !== props.placeholder ||
    next.submitLabel !== props.submitLabel;
  props = next;
  if (busyChanged || copyChanged || partial.onSubmit) {
    renderIsland();
  }
  syncHostBox();
}

export function unmountGlobeComposeIsland(): void {
  disposeIslandHost();
}

export function readGlobeComposeIslandHandle(): GlobeContextConditionComposeInputHandle | null {
  return handleRef.current;
}
