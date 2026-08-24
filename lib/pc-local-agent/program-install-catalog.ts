import { resolvePcSetupDownloadUrl } from "@/lib/pc-local-agent/setup-url";

export type PcProgramId = "rimvio-pc" | "cursor" | "chrome";

export type PcProgramInstallOffer = {
  id: PcProgramId;
  /** L1 copy key suffix under globe.pcContinuity */
  nameKey: "programRimvioPc" | "programCursor" | "programChrome";
  url: string;
  filename: string;
};

const INSTALL_VERB_RE = /설치|깔아|깔아줘|깔게요|다운받|다운로드|download|인스톨|setup\.exe/iu;
const PC_CONNECT_RE = /내\s*pc|림비오\s*pc|rimvio\s*pc|pc\s*연결|pc\s*설치|컴퓨터\s*연결/iu;
const CURSOR_RE =
  /cursor|커서\s*(설치|깔|앱|실행|열어|켜|에디터)|커서에서|커서로|cursor에서/iu;
const CHROME_RE = /(?:크롬|chrome)\s*(설치|깔|실행|열어|켜|다운)|브라우저\s*(설치|깔|열어)/iu;
const ALL_APPS_RE = /프로그램|앱들?|소프트웨어/iu;

export function cursorSetupUrl(): string {
  return (
    process.env.RIMVIO_CURSOR_SETUP_URL?.trim() ||
    "https://cursor.com/api/download?platform=win32-x64-user&releaseTrack=stable"
  );
}

export function chromeSetupUrl(): string {
  return (
    process.env.RIMVIO_CHROME_SETUP_URL?.trim() ||
    "https://dl.google.com/chrome/install/latest/chrome_installer.exe"
  );
}

export function programUrl(id: PcProgramId): string {
  if (id === "rimvio-pc") {
    return resolvePcSetupDownloadUrl();
  }
  if (id === "cursor") {
    return cursorSetupUrl();
  }
  return chromeSetupUrl();
}

export function programFilename(id: PcProgramId): string {
  if (id === "rimvio-pc") {
    return "Rimvio-Setup.exe";
  }
  if (id === "cursor") {
    return "CursorUserSetup.exe";
  }
  return "ChromeSetup.exe";
}

export function programNameKey(id: PcProgramId): PcProgramInstallOffer["nameKey"] {
  if (id === "rimvio-pc") {
    return "programRimvioPc";
  }
  if (id === "cursor") {
    return "programCursor";
  }
  return "programChrome";
}

/** Internal query: purchase Run needs Rimvio PC + Chrome, not Cursor. */
export const PC_PURCHASE_PROGRAM_QUERY = "__purchase_run__";

export function listAllProgramInstallOffers(): PcProgramInstallOffer[] {
  return (["rimvio-pc", "cursor", "chrome"] as const).map(toOffer);
}

export function programsForPcPurchaseRun(): PcProgramInstallOffer[] {
  return [toOffer("rimvio-pc"), toOffer("chrome")];
}

function toOffer(id: PcProgramId): PcProgramInstallOffer {
  return {
    id,
    nameKey: programNameKey(id),
    url: programUrl(id),
    filename: programFilename(id),
  };
}

/** Click-to-install programs for this command. Empty = not an install command. */
export function resolveProgramInstallOffers(utterance: string): PcProgramInstallOffer[] {
  const text = utterance.trim();
  if (!text) {
    return [];
  }
  if (text === PC_PURCHASE_PROGRAM_QUERY) {
    return programsForPcPurchaseRun();
  }
  const installVerb = INSTALL_VERB_RE.test(text);
  const pcConnect = PC_CONNECT_RE.test(text);
  const cursor = CURSOR_RE.test(text);
  const chrome = CHROME_RE.test(text);
  const allApps = ALL_APPS_RE.test(text) && installVerb;

  if (!pcConnect && !cursor && !chrome && !allApps) {
    return [];
  }

  const ids = new Set<PcProgramId>(["rimvio-pc"]);
  if (cursor || allApps) {
    ids.add("cursor");
  }
  if (chrome || allApps) {
    ids.add("chrome");
  }
  return (["rimvio-pc", "cursor", "chrome"] as const)
    .filter((id) => ids.has(id))
    .map(toOffer);
}

export function isPcProgramId(value: string): value is PcProgramId {
  return value === "rimvio-pc" || value === "cursor" || value === "chrome";
}

export function programClientDownloadPath(id: PcProgramId): string {
  return `/api/pc-agent/programs/download?id=${id}`;
}

export function isPcProgramInstallUtterance(utterance: string): boolean {
  return resolveProgramInstallOffers(utterance).length > 0;
}
