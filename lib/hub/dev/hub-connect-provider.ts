/**
 * Resolve OAuth provider from user utterance (connect intent).
 */

import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";

const PROVIDER_PATTERNS: ReadonlyArray<{
  readonly provider: HubPlatformProviderId;
  readonly patterns: readonly RegExp[];
}> = [
  {
    provider: "github",
    patterns: [
      /github/i,
      /git\s*hub/i,
      /깃허브/i,
      /깃허브연결/i,
      /레포/i,
      /repository/i,
      /repo\s*연결/i,
    ],
  },
  {
    provider: "vercel",
    patterns: [/vercel/i, /버셀/i, /deploy\s*target/i],
  },
  {
    provider: "supabase",
    patterns: [/supabase/i, /수파베이스/i, /database\s*연결/i, /db\s*연결/i],
  },
  {
    provider: "stripe",
    patterns: [/stripe/i, /스트라이프/i, /결제\s*연결/i, /payment\s*connect/i],
  },
  {
    provider: "openai",
    patterns: [/openai/i, /gpt/i, /api\s*key/i],
  },
];

export function resolveConnectProviderFromUtterance(utterance: string): HubPlatformProviderId {
  const text = utterance.trim();
  for (const { provider, patterns } of PROVIDER_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return provider;
  }
  return "github";
}

export function isConnectUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  return /연결|connect|oauth/i.test(text);
}

export function providerLabel(provider: HubPlatformProviderId): string {
  switch (provider) {
    case "github":
      return "GitHub";
    case "vercel":
      return "Vercel";
    case "supabase":
      return "Supabase";
    case "stripe":
      return "Stripe";
    case "openai":
      return "OpenAI";
    case "mcp":
      return "MCP";
    default:
      return provider;
  }
}

export function connectActionIdForProvider(provider: HubPlatformProviderId): string {
  return `connect_${provider}`;
}

export function connectActionLabelKo(provider: HubPlatformProviderId): string {
  switch (provider) {
    case "github":
      return "GitHub 연결";
    case "vercel":
      return "Vercel 연결";
    case "supabase":
      return "Supabase 연결";
    case "stripe":
      return "Stripe 연결";
    case "openai":
      return "OpenAI 연결";
    default:
      return `${providerLabel(provider)} 연결`;
  }
}

/** Providers shown in Cursor-style Integrations panel. */
export const INTEGRATION_PROVIDERS: readonly HubPlatformProviderId[] = [
  "github",
  "vercel",
  "supabase",
  "stripe",
  "openai",
] as const;
