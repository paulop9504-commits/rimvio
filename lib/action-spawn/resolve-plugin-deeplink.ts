/** Map plugin ids to actionable deeplinks (web / app scheme). */

const PLUGIN_DEEPLINKS: Record<string, string | ((ctx: DeeplinkContext) => string)> = {
  "kakao.taxi": (ctx) => {
    const dest = encodeURIComponent(ctx.destination ?? "강남역");
    return `https://taxi.kakao.com/?dest=${dest}`;
  },
  navigation: (ctx) => {
    const dest = encodeURIComponent(ctx.destination ?? ctx.label ?? "목적지");
    return `https://map.kakao.com/link/search/${dest}`;
  },
  tel: () => "tel:",
  "ticket.view": () => "glango://ticket/view",
  "parking.register": () => "glango://parking/register",
  "zoom.join": () => "glango://zoom/join",
  "file.open": (ctx) => ctx.file_url ?? "glango://file/deck",
  "card.qr": () => "glango://card/qr",
  "order.pickup": (ctx) => {
    const item = encodeURIComponent(ctx.label ?? "샐러드");
    return `glango://order/pickup?item=${item}`;
  },
  "gym.barcode": () => "glango://gym/barcode",
  "calendar.view": () => "glango://calendar/today",
  "roaming.esim": () => "glango://roaming/esim",
  "finance.fx": () => "glango://finance/fx",
  "passport.check": () => "glango://passport/check",
  "transit.ic_card": () => "glango://transit/ic-card",
  "search.web": (ctx) => {
    const q = encodeURIComponent(ctx.label ?? "travel prep");
    return `https://www.google.com/search?q=${q}`;
  },
  "chat.followup": (ctx) => {
    const q = encodeURIComponent(ctx.label ?? "help me prepare");
    return `glango://chat/followup?q=${q}`;
  },
};

export type DeeplinkContext = {
  label?: string;
  destination?: string | null;
  file_url?: string | null;
};

export function resolvePluginDeeplink(
  plugin: string | null | undefined,
  context: DeeplinkContext = {},
): string | null {
  if (!plugin?.trim()) {
    return null;
  }

  const entry = PLUGIN_DEEPLINKS[plugin.trim()];
  if (!entry) {
    return `glango://${plugin.replace(/\./g, "/")}`;
  }

  return typeof entry === "function" ? entry(context) : entry;
}
