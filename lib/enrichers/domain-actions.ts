import {
  attachCopyText,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import type { LinkActionItem } from "@/types/database";

function toSpotifyUri(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parts.length >= 2 && /^(track|album|playlist|episode|show)$/i.test(parts[0])) {
      return `spotify:${parts[0]}:${parts[1]}`;
    }
  } catch {
    // Ignore invalid URLs.
  }

  return null;
}

function truncate(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Extra app/deep-link actions for generic enricher fallback. */
export function buildDomainQuickActions(
  rawUrl: string,
  domain: string,
  title: string | null
): LinkActionItem[] {
  const target = `${domain} ${rawUrl}`.toLowerCase();
  const copyText = title?.trim() || null;
  const actions: LinkActionItem[] = [];

  const spotifyUri = toSpotifyUri(rawUrl);
  if (spotifyUri && /spotify|open\.spotify/i.test(target)) {
    actions.push(
      createOpenAction({
        label: "🎧 Spotify에서 재생",
        href: spotifyUri,
        icon: "spotify",
        copyText,
      })
    );
  }

  if (/instagram\.com|instagr\.am/i.test(target)) {
    actions.push(
      createOpenAction({
        label: "📷 Instagram 열기",
        href: rawUrl,
        icon: "instagram",
        copyText,
      })
    );
  }

  if (/figma\.com/i.test(target)) {
    actions.push(
      createOpenAction({
        label: "🎨 Figma 열기",
        href: rawUrl,
        icon: "figma",
        copyText: copyText ?? "Figma",
      })
    );
  }

  if (/notion\.(so|site)/i.test(target)) {
    actions.push(
      createOpenAction({
        label: "📝 Notion 열기",
        href: rawUrl,
        icon: "notion",
        copyText,
      })
    );
  }

  if (/twitter\.com|x\.com/i.test(target)) {
    actions.push(
      createOpenAction({
        label: "🐦 X 열기",
        href: rawUrl,
        icon: "twitter",
        copyText,
      })
    );
  }

  if (/threads\.net/i.test(target)) {
    actions.push(
      createOpenAction({
        label: "🧵 Threads 열기",
        href: rawUrl,
        icon: "link",
        copyText,
      })
    );
  }

  if (/t\.me|telegram\./i.test(target)) {
    actions.push(
      createOpenAction({
        label: "✈️ Telegram 열기",
        href: rawUrl,
        icon: "link",
        copyText,
      })
    );
  }

  if (/linkedin\.com/i.test(target)) {
    actions.push(
      createOpenAction({
        label: "💼 LinkedIn 열기",
        href: rawUrl,
        icon: "link",
        copyText,
      })
    );
  }

  if (/music\.apple\.com|itunes\.apple/i.test(target)) {
    actions.push(
      createOpenAction({
        label: "🎵 Apple Music 열기",
        href: rawUrl,
        icon: "link",
        copyText,
      })
    );
  }

  if (copyText && actions.length === 0 && !/^(link|example)/i.test(domain)) {
    actions.push(
      attachCopyText(
        createOpenAction({
          label: `🔗 ${truncate(copyText)} 열기`,
          href: rawUrl,
          icon: "external-link",
        }),
        copyText
      )
    );
  }

  return actions.slice(0, 2);
}
