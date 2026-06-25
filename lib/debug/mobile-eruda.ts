import { isMobileDevice } from "@/lib/platform/device";

const STORAGE_KEY = "rimvio-eruda-debug";

let initStarted = false;

/** Mobile-only Eruda — enable with ?debug=1, disable with ?debug=0. */
export function shouldEnableMobileEruda(): boolean {
  if (typeof window === "undefined" || !isMobileDevice()) {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const flag = params.get("debug")?.trim();

  if (flag === "1") {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // private mode
    }
    return true;
  }

  if (flag === "0") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return false;
  }

  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function wireGlobalErrorTaps(): void {
  const log = (label: string, detail: string) => {
    console.error(`[Rimvio ${label}]`, detail);
  };

  window.addEventListener("error", (event) => {
    const message = event.message?.trim() || "unknown error";
    const where = event.filename
      ? `${event.filename}:${event.lineno ?? 0}:${event.colno ?? 0}`
      : "unknown";
    log("window.error", `${message} @ ${where}`);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const detail =
      reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : typeof reason === "string"
          ? reason
          : JSON.stringify(reason);
    log("unhandledrejection", detail);
  });

  window.addEventListener("pagehide", () => {
    console.warn("[Rimvio pagehide]", document.visibilityState);
  });
}

export async function initMobileErudaIfEnabled(): Promise<boolean> {
  if (initStarted || !shouldEnableMobileEruda()) {
    return false;
  }
  initStarted = true;

  try {
    const eruda = (await import("eruda")).default;
    eruda.init();
    wireGlobalErrorTaps();
    console.info("[Rimvio] Mobile Eruda debug panel enabled (?debug=0 to disable)");
    return true;
  } catch (error) {
    initStarted = false;
    console.warn("[Rimvio] Eruda failed to load", error);
    return false;
  }
}

export function resetMobileErudaForTests(): void {
  initStarted = false;
}
