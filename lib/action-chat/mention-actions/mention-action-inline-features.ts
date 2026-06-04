/** Feature ids handled by the generic inline @ action chip (not orchestrator). */

export const MENTION_ACTION_INLINE_FEATURE_IDS = new Set([
  "weather",
  "price",
  "taxi",
  "phone",
  "paste",
  "parcel",
  "link",
  "dutch",
  "delivery",
  "pickup",
  "tip",
  "exchange",
  "gas",
  "commute",
  "leave",
  "water",
  "exercise",
  "lunch",
  "memo",
  "todo",
  "receipt",
  "coupon",
  "umbrella",
  "translate",
  "station",
  "now",
  "retry",
  "capture",
  "dnd",
  "manual",
  "friend_add",
]);

const DEDICATED_LOCAL_INLINE_FEATURE_IDS = new Set([
  "timer",
  "reminder",
  "navigate",
  "schedule",
  "transfer",
  "parking",
  "focus",
]);

export function isMentionActionInlineFeature(featureId: string): boolean {
  return MENTION_ACTION_INLINE_FEATURE_IDS.has(featureId);
}

export function isLocalInlineMentionFeature(featureId: string): boolean {
  return (
    DEDICATED_LOCAL_INLINE_FEATURE_IDS.has(featureId) ||
    MENTION_ACTION_INLINE_FEATURE_IDS.has(featureId)
  );
}

export const MENTION_ACTION_ICONS: Record<string, string> = {
  navigate: "🧭",
  weather: "🌤",
  meal: "🍽",
  price: "💰",
  schedule: "📋",
  reminder: "🔔",
  timer: "⏱",
  transfer: "💸",
  parking: "🅿️",
  focus: "🎯",
  taxi: "🚕",
  phone: "📞",
  paste: "📋",
  parcel: "📦",
  link: "🔗",
  dutch: "🧮",
  delivery: "🍔",
  pickup: "☕",
  tip: "💵",
  exchange: "💱",
  gas: "⛽",
  commute: "🌅",
  leave: "🌆",
  water: "💧",
  exercise: "🏃",
  lunch: "🍱",
  memo: "📝",
  todo: "✅",
  receipt: "🧾",
  coupon: "🎟",
  umbrella: "☔",
  translate: "🌐",
  station: "🚇",
  now: "⚡",
  retry: "🔁",
  capture: "📷",
  dnd: "🔕",
  linksheet: "📊",
  manual: "📖",
  calendar: "📅",
  friend_add: "👋",
};
