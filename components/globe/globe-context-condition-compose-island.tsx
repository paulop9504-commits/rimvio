"use client";

/**
 * Pure-DOM compose island — zero React while typing.
 * Parent PinBar/PromptFrame storms cannot stall Korean IME.
 */

import { setGlobeComposeInputFocused } from "@/lib/globe/compose-input-focus";

type IslandProps = {
  busy: boolean;
  placeholder: string;
  submitLabel: string;
  onSubmit: () => void;
};

let host: HTMLDivElement | null = null;
let slot: HTMLElement | null = null;
let inputEl: HTMLInputElement | null = null;
let buttonEl: HTMLButtonElement | null = null;
let props: IslandProps | null = null;
let resizeObserver: ResizeObserver | null = null;
let busy = false;

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
  host.style.left = `${Math.round(rect.left)}px`;
  host.style.top = `${Math.round(rect.top)}px`;
  host.style.width = `${Math.round(rect.width)}px`;
  host.style.height = `${Math.max(Math.round(rect.height), 40)}px`;
  host.style.zIndex = "90";
  host.style.boxSizing = "border-box";
}

function syncButtonEnabled(): void {
  if (!buttonEl || !inputEl) {
    return;
  }
  const hasText = inputEl.value.trim().length > 0;
  buttonEl.disabled = busy || !hasText;
  buttonEl.style.opacity = buttonEl.disabled ? "0.4" : "1";
  buttonEl.textContent = busy ? "…" : (props?.submitLabel ?? "찾기");
}

function onViewportChange(): void {
  // Never move the input while IME is composing — layout thrash stalls glyphs.
  if (document.activeElement === inputEl) {
    return;
  }
  syncHostBox();
}

function disposeIslandHost(): void {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener("resize", onViewportChange);
  window.visualViewport?.removeEventListener("resize", onViewportChange);
  window.visualViewport?.removeEventListener("scroll", onViewportChange);
  setGlobeComposeInputFocused(false);
  host?.remove();
  host = null;
  slot = null;
  inputEl = null;
  buttonEl = null;
  props = null;
  busy = false;
}

function buildIslandDom(next: IslandProps): void {
  if (!host) {
    return;
  }
  host.replaceChildren();
  host.style.display = "flex";
  host.style.alignItems = "center";
  host.style.gap = "8px";
  host.style.borderRadius = "12px";
  host.style.background = "#f5f5f7";
  host.style.padding = "8px 12px";
  host.style.boxShadow = "inset 0 0 0 1px rgba(0,0,0,0.04)";

  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.autocapitalize = "off";
  input.spellcheck = false;
  input.enterKeyHint = "search";
  input.placeholder = next.placeholder;
  input.setAttribute("aria-label", next.placeholder);
  input.style.flex = "1";
  input.style.minWidth = "0";
  input.style.border = "0";
  input.style.outline = "none";
  input.style.background = "transparent";
  input.style.fontSize = "13px";
  input.style.color = "#1d1d1f";
  input.dataset.globeContextConditionComposeInput = "true";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = next.submitLabel;
  button.style.flexShrink = "0";
  button.style.borderRadius = "8px";
  button.style.background = "#1d1d1f";
  button.style.color = "#fff";
  button.style.fontSize = "11px";
  button.style.fontWeight = "600";
  button.style.padding = "4px 10px";
  button.style.border = "0";
  button.style.cursor = "pointer";

  input.addEventListener("focus", () => {
    setGlobeComposeInputFocused(true);
  });
  input.addEventListener("blur", () => {
    setGlobeComposeInputFocused(false);
  });
  input.addEventListener("input", () => {
    syncButtonEnabled();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    event.preventDefault();
    if (busy || !input.value.trim()) {
      return;
    }
    props?.onSubmit();
    input.blur();
  });
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  button.addEventListener("click", () => {
    if (busy || !input.value.trim()) {
      return;
    }
    props?.onSubmit();
    input.blur();
  });

  host.append(input, button);
  inputEl = input;
  buttonEl = button;
  syncButtonEnabled();
}

export function mountGlobeComposeIsland(
  slotEl: HTMLElement,
  next: IslandProps,
): void {
  if (host) {
    disposeIslandHost();
  }

  slot = slotEl;
  props = next;
  busy = next.busy;

  host = document.createElement("div");
  host.setAttribute("data-globe-compose-island-host", "true");
  host.setAttribute("data-globe-context-condition-compose-input", "true");
  document.body.appendChild(host);

  window.addEventListener("resize", onViewportChange);
  window.visualViewport?.addEventListener("resize", onViewportChange);
  window.visualViewport?.addEventListener("scroll", onViewportChange);

  resizeObserver = new ResizeObserver(() => {
    if (document.activeElement === inputEl) {
      return;
    }
    syncHostBox();
  });
  resizeObserver.observe(slotEl);

  buildIslandDom(next);
  syncHostBox();
}

export function updateGlobeComposeIsland(partial: Partial<IslandProps>): void {
  if (!props) {
    return;
  }
  props = { ...props, ...partial };
  if (typeof partial.busy === "boolean") {
    busy = partial.busy;
  }
  if (partial.placeholder && inputEl) {
    inputEl.placeholder = partial.placeholder;
    inputEl.setAttribute("aria-label", partial.placeholder);
  }
  syncButtonEnabled();
}

export function unmountGlobeComposeIsland(): void {
  disposeIslandHost();
}

export type GlobeComposeIslandHandle = {
  clear: () => void;
  getValue: () => string;
};

export function readGlobeComposeIslandHandle(): GlobeComposeIslandHandle | null {
  if (!inputEl) {
    return null;
  }
  return {
    clear: () => {
      if (inputEl) {
        inputEl.value = "";
      }
      syncButtonEnabled();
    },
    getValue: () => inputEl?.value ?? "",
  };
}
