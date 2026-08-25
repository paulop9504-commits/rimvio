/** Allowlisted PC work — never pass raw user text to a shell. */

export const PC_DESKTOP_CARRIER_URL = "https://example.com/#rimvio-pc";

export type PcDesktopAppId =
  | "notepad"
  | "calc"
  | "paint"
  | "explorer"
  | "downloads"
  | "documents"
  | "desktop-folder"
  | "pictures"
  | "settings"
  | "snipping"
  | "chrome"
  | "edge"
  | "spotify"
  | "discord"
  | "slack"
  | "kakaotalk"
  | "zoom"
  | "notion"
  | "cursor"
  | "vscode"
  | "steam"
  | "excel"
  | "word"
  | "powerpoint"
  | "outlook"
  | "teams";

export type PcRemotePlan =
  | { kind: "purchase" }
  | { kind: "install"; query: string }
  | { kind: "desktop"; appId: PcDesktopAppId; title: string; url: string }
  | {
      kind: "open_url";
      url: string;
      title: string;
      via: "link" | "site" | "search";
    };

const PC_DIRECTED_RE =
  /(?:내\s*)?(?:pc|피씨)|컴퓨터|윈도우|크롬에서|브라우저에서|이\s*컴/iu;

const APP_ROWS: readonly { id: PcDesktopAppId; title: string; re: RegExp }[] = [
  { id: "downloads", title: "다운로드 폴더", re: /다운로드\s*폴더|다운\s*폴더|downloads?\s*folder/iu },
  { id: "documents", title: "문서 폴더", re: /문서\s*폴더|내\s*문서|documents?\s*folder/iu },
  { id: "desktop-folder", title: "바탕 화면", re: /바탕\s*화면\s*폴더|데스크탑\s*폴더|desktop\s*folder/iu },
  { id: "pictures", title: "사진 폴더", re: /사진\s*폴더|그림\s*폴더|pictures?\s*folder/iu },
  { id: "snipping", title: "캡처 도구", re: /캡처\s*도구|갈무리|스크린\s*샷|화면\s*캡처|snipping/iu },
  { id: "settings", title: "설정", re: /(?:윈도우\s*)?설정(?:창|앱)?|제어판|ms-settings|windows\s*settings/iu },
  { id: "notepad", title: "메모장", re: /메모장|notepad/iu },
  { id: "calc", title: "계산기", re: /계산기|calculator/iu },
  { id: "paint", title: "그림판", re: /그림판|mspaint|paint(?!\s*folder)/iu },
  { id: "explorer", title: "탐색기", re: /탐색기|파일\s*탐색|file\s*explorer|(?:폴더|파일)\s*(?:열어|켜)/iu },
  { id: "kakaotalk", title: "카카오톡", re: /카카오톡|카톡(?!\s*맵)|kakaotalk/iu },
  { id: "spotify", title: "Spotify", re: /스포티파이|spotify/iu },
  { id: "discord", title: "Discord", re: /디스코드|discord/iu },
  { id: "slack", title: "Slack", re: /슬랙|slack/iu },
  { id: "zoom", title: "Zoom", re: /줌\s*(?:켜|열어|실행)|zoom/iu },
  { id: "notion", title: "Notion", re: /노션|notion/iu },
  { id: "cursor", title: "Cursor", re: /커서(?:를|를)?\s*(?:열어|켜|실행)|cursor\s*(?:열어|켜|실행|open)/iu },
  { id: "vscode", title: "VS Code", re: /vs\s*code|비주얼\s*스튜디오\s*코드|vscode/iu },
  { id: "steam", title: "Steam", re: /스팀|steam/iu },
  { id: "excel", title: "Excel", re: /엑셀|excel/iu },
  { id: "word", title: "Word", re: /워드(?!\s*프레스)|ms\s*word/iu },
  { id: "powerpoint", title: "PowerPoint", re: /파워\s*포인트|powerpoint|ppt/iu },
  { id: "outlook", title: "Outlook", re: /아웃룩|outlook/iu },
  { id: "teams", title: "Teams", re: /팀즈|teams/iu },
  { id: "chrome", title: "Chrome", re: /크롬|chrome/iu },
  { id: "edge", title: "Edge", re: /엣지|edge\s*(?:열어|켜|실행)|microsoft\s*edge/iu },
];

const SITE_ROWS: readonly { re: RegExp; url: string | ((q: string) => string); title: string }[] = [
  { re: /지메일|gmail|구글\s*메일/iu, url: "https://mail.google.com/", title: "Gmail" },
  { re: /구글\s*캘린더|캘린더\s*열어|google\s*calendar/iu, url: "https://calendar.google.com/", title: "캘린더" },
  { re: /구글\s*드라이브|드라이브\s*열어|google\s*drive/iu, url: "https://drive.google.com/", title: "드라이브" },
  { re: /카카오맵|카카오\s*지도/iu, url: "https://map.kakao.com/", title: "카카오맵" },
  { re: /네이버\s*지도|naver\s*map/iu, url: "https://map.naver.com/", title: "네이버 지도" },
  { re: /구글\s*지도|google\s*maps?/iu, url: "https://maps.google.com/", title: "Google Maps" },
  { re: /파파고|papago/iu, url: "https://papago.naver.com/", title: "파파고" },
  { re: /인스타(?:그램)?|instagram/iu, url: "https://www.instagram.com/", title: "Instagram" },
  { re: /페이스북|facebook/iu, url: "https://www.facebook.com/", title: "Facebook" },
  { re: /트위터|(?<![a-z])x\.com|twitter/iu, url: "https://x.com/", title: "X" },
  { re: /깃허브|github/iu, url: "https://github.com/", title: "GitHub" },
  { re: /챗\s*지피티|챗gpt|chatgpt/iu, url: "https://chatgpt.com/", title: "ChatGPT" },
  { re: /클로드|claude\.ai|claude/iu, url: "https://claude.ai/", title: "Claude" },
  { re: /피그마|figma/iu, url: "https://www.figma.com/", title: "Figma" },
  { re: /넷플릭스|netflix/iu, url: "https://www.netflix.com/", title: "Netflix" },
  { re: /유튜브\s*뮤직|youtube\s*music/iu, url: "https://music.youtube.com/", title: "YouTube Music" },
  { re: /배달의민족|배민/iu, url: "https://www.baemin.com/", title: "배달의민족" },
  { re: /요기요/iu, url: "https://www.yogiyo.co.kr/", title: "요기요" },
  { re: /쿠팡이츠|coupang\s*eats/iu, url: "https://www.coupangeats.com/", title: "쿠팡이츠" },
  { re: /당근(?:마켓)?/iu, url: "https://www.daangn.com/", title: "당근" },
  { re: /아마존|amazon/iu, url: "https://www.amazon.com/", title: "Amazon" },
  { re: /지마켓|gmarket/iu, url: "https://www.gmarket.co.kr/", title: "Gmarket" },
  { re: /11번가|11st/iu, url: "https://www.11st.co.kr/", title: "11번가" },
];

const OPEN_APP_HINT_RE =
  /열어(?:줘|주세요)?|켜(?:줘|주세요)?|실행(?:해(?:줘|주세요)?)?|켜라|실행해|띄워|켜봐/iu;

function desktopPlan(appId: PcDesktopAppId, title: string): Extract<PcRemotePlan, { kind: "desktop" }> {
  return { kind: "desktop", appId, title, url: PC_DESKTOP_CARRIER_URL };
}

function sitePlan(url: string, title: string): Extract<PcRemotePlan, { kind: "open_url" }> {
  return { kind: "open_url", url, title, via: "site" };
}

export function isPcDesktopAppId(value: string): value is PcDesktopAppId {
  return APP_ROWS.some((row) => row.id === value);
}

function mapsUrl(query: string): string {
  const q = query.trim();
  if (!q) {
    return "https://map.naver.com/";
  }
  return `https://map.naver.com/p/search/${encodeURIComponent(q)}`;
}

function translateUrl(query: string): string {
  const q = query.trim();
  if (!q) {
    return "https://papago.naver.com/";
  }
  return `https://papago.naver.com/?sk=auto&tk=ko&st=${encodeURIComponent(q)}`;
}

function weatherUrl(query: string): string {
  const q = query.trim() || "날씨";
  return `https://www.google.com/search?q=${encodeURIComponent(`${q} 날씨`)}`;
}

function newsUrl(query: string): string {
  const q = query.trim() || "뉴스";
  return `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;
}

function stripWorkFiller(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/giu, " ")
    .replace(PC_DIRECTED_RE, " ")
    .replace(
      /유튜브에서|youtube에서|네이버에서|naver에서|구글에서|google에서|크롬에서|chrome에서/giu,
      " ",
    )
    .replace(/유튜브|youtube|네이버|naver|구글|google|크롬|chrome|브라우저/giu, " ")
    .replace(
      /열어줘|열어주세요|열어|켜줘|켜주세요|켜|실행해줘|실행해주세요|실행해|검색해줘|검색해주세요|검색해|찾아줘|찾아주세요|찾아|보여줘|보여주세요|틀어줘|틀어|띄워줘|띄워/giu,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function resolvePcDesktopWork(utterance: string): PcRemotePlan | null {
  const text = utterance.trim();
  if (!text) {
    return null;
  }

  const maps = text.match(
    /(?:길찾기|가는\s*길|내비|지도에서|맵에서)\s*(.+)$/iu,
  ) ?? text.match(/^(.+?)\s*(?:길찾기|가는\s*길)$/iu);
  if (maps?.[1]?.trim()) {
    const q = maps[1].trim();
    return sitePlan(mapsUrl(q), `길찾기 ${q}`.slice(0, 48));
  }

  const tr = text.match(/번역(?:해(?:줘|주세요)?)?\s+(.+)$/iu);
  if (tr?.[1]?.trim()) {
    const q = tr[1].trim();
    return sitePlan(translateUrl(q), "번역");
  }

  if (/날씨/iu.test(text) && (OPEN_APP_HINT_RE.test(text) || PC_DIRECTED_RE.test(text) || /검색|보여/iu.test(text))) {
    const q = stripWorkFiller(text.replace(/날씨/giu, " ")).trim();
    return sitePlan(weatherUrl(q), "날씨");
  }

  if (/뉴스/iu.test(text) && (OPEN_APP_HINT_RE.test(text) || PC_DIRECTED_RE.test(text) || /검색|보여/iu.test(text))) {
    const q = stripWorkFiller(text.replace(/뉴스/giu, " ")).trim();
    return sitePlan(newsUrl(q), "뉴스");
  }

  for (const row of APP_ROWS) {
    if (!row.re.test(text)) {
      continue;
    }
    if (row.id === "settings" && !OPEN_APP_HINT_RE.test(text) && !/제어판|설정\s*(열어|켜|실행)/iu.test(text)) {
      continue;
    }
    if (
      (row.id === "chrome" || row.id === "edge" || row.id === "cursor") &&
      /설치|깔아|깔게요|다운받|인스톨/iu.test(text)
    ) {
      continue;
    }
    if (
      (row.id === "chrome" || row.id === "edge") &&
      !OPEN_APP_HINT_RE.test(text) &&
      !PC_DIRECTED_RE.test(text)
    ) {
      continue;
    }
    return desktopPlan(row.id, row.title);
  }

  for (const row of SITE_ROWS) {
    if (!row.re.test(text)) {
      continue;
    }
    const url = typeof row.url === "function" ? row.url(stripWorkFiller(text)) : row.url;
    return sitePlan(url, row.title);
  }

  return null;
}

export function isPcDirectedUtterance(utterance: string): boolean {
  return PC_DIRECTED_RE.test(utterance.trim());
}

/** Globe chat: send to PC only when the utterance is clearly computer work. */
export function shouldDispatchPcWorkFromGlobe(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) {
    return false;
  }
  const work = resolvePcDesktopWork(text);
  if (work?.kind === "desktop") {
    return true;
  }
  if (work?.kind === "open_url") {
    return true;
  }
  if (isPcDirectedUtterance(text) && /열어|켜|실행|검색|찾아|틀어/iu.test(text)) {
    return true;
  }
  return false;
}
