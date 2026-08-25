import { isPcProgramInstallUtterance } from "@/lib/pc-local-agent/program-install-catalog";
import { isPcPurchaseContinuityUtterance } from "@/lib/pc-local-agent/purchase-intent";
import {
  isPcDirectedUtterance,
  resolvePcDesktopWork,
  shouldDispatchPcWorkFromGlobe,
  type PcRemotePlan,
} from "@/lib/pc-local-agent/pc-desktop-work";
import { isPcAgentNavigableUrl } from "@/lib/pc-local-agent/url-safety";

export type { PcRemotePlan };

const FILLER_RE =
  /^(?:좀|제발|바로|빨리)?\s*(?:열어(?:줘|주세요)?|켜(?:줘|주세요)?|실행(?:해(?:줘|주세요)?)?|검색(?:해(?:줘|주세요)?)?|찾아(?:줘|주세요)?|보여(?:줘|주세요)?)\s*$/iu;

function stripCommandFiller(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/giu, " ")
    .replace(
      /유튜브에서|youtube에서|네이버에서|naver에서|구글에서|google에서|크롬에서|chrome에서/giu,
      " ",
    )
    .replace(
      /유튜브|youtube|네이버|naver|구글|google|크롬|chrome|브라우저/giu,
      " ",
    )
    .replace(
      /열어줘|열어주세요|열어|켜줘|켜주세요|켜|실행해줘|실행해주세요|실행해|검색해줘|검색해주세요|검색해|찾아줘|찾아주세요|찾아|보여줘|보여주세요|틀어줘|틀어/giu,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function firstHttpUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/iu);
  return match?.[0] ?? null;
}

export { shouldDispatchPcWorkFromGlobe };

export function resolvePcRemoteCommand(utterance: string): PcRemotePlan {
  const text = utterance.trim();
  if (isPcPurchaseContinuityUtterance(text)) {
    return { kind: "purchase" };
  }
  if (isPcProgramInstallUtterance(text)) {
    return { kind: "install", query: text };
  }

  const rawUrl = firstHttpUrl(text);
  if (rawUrl && isPcAgentNavigableUrl(rawUrl)) {
    return { kind: "open_url", url: rawUrl, title: text.slice(0, 48), via: "link" };
  }

  const desktop = resolvePcDesktopWork(text);
  if (desktop) {
    return desktop;
  }

  const q = stripCommandFiller(text);
  const title = text.slice(0, 48) || "PC 실행";
  const query = q && !FILLER_RE.test(q) ? q : text;

  if (/유튜브|youtube/iu.test(text)) {
    return {
      kind: "open_url",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      title,
      via: "site",
    };
  }
  if (/네이버|naver/iu.test(text)) {
    return {
      kind: "open_url",
      url: `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`,
      title,
      via: "site",
    };
  }

  return {
    kind: "open_url",
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    title,
    via: isPcDirectedUtterance(text) ? "site" : "search",
  };
}
