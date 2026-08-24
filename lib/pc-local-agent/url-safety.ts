import { isPcAgentCheckoutUrl } from "./purchase-intent";

const DEMO_HOSTS = new Set(["example.com", "www.example.com"]);

export function isPcAgentDemoAllowlistedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DEMO_HOSTS.has(host);
  } catch {
    return false;
  }
}

/** OPEN_URL / browser.open — http(s) only. example.com stays allowlisted. Checkout start URLs blocked. */
export function isPcAgentNavigableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (isPcAgentDemoAllowlistedUrl(url)) {
      return !isPcAgentCheckoutUrl(url);
    }
    return !isPcAgentCheckoutUrl(url);
  } catch {
    return false;
  }
}
