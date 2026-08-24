import { existsSync } from "node:fs";
import { join } from "node:path";

/** Official Chrome setup for double-click. StandaloneSetup64.exe shows "Invalid option". */
export const CHROME_SETUP_FILENAME = "ChromeSetup.exe";

export function chromeSetupDownloadUrl(): string {
  return (
    process.env.RIMVIO_CHROME_SETUP_URL?.trim() ||
    "https://dl.google.com/chrome/install/latest/chrome_installer.exe"
  );
}

export function chromeExecutableCandidates(env: NodeJS.ProcessEnv = process.env): string[] {
  const local = env.LOCALAPPDATA?.trim();
  const pf = env.PROGRAMFILES?.trim();
  const pfx = env["PROGRAMFILES(X86)"]?.trim();
  const out: string[] = [];
  if (local) {
    out.push(join(local, "Google", "Chrome", "Application", "chrome.exe"));
  }
  if (pf) {
    out.push(join(pf, "Google", "Chrome", "Application", "chrome.exe"));
  }
  if (pfx) {
    out.push(join(pfx, "Google", "Chrome", "Application", "chrome.exe"));
  }
  return out;
}

export function isChromeInstalled(env: NodeJS.ProcessEnv = process.env): boolean {
  return chromeExecutableCandidates(env).some((path) => existsSync(path));
}
