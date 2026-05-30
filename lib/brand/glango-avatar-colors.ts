/** Glango avatar color variants — eye ring + pupil + smile. Purple = brand original (1%). */
export const GLANGO_AVATAR_VARIANTS = {
  red: {
    id: "red",
    labelKo: "빨강",
    tierKo: "흔함",
    tierEmoji: "🍎",
    weight: 35,
    eyeRing: "#F87171",
    pupil: "#B91C1C",
    smile: "#EF4444",
    accent: "#EF4444",
  },
  orange: {
    id: "orange",
    labelKo: "주황",
    tierKo: "흔함",
    tierEmoji: "🍊",
    weight: 25,
    eyeRing: "#FB923C",
    pupil: "#C2410C",
    smile: "#F97316",
    accent: "#F97316",
  },
  yellow: {
    id: "yellow",
    labelKo: "노랑",
    tierKo: "무난",
    tierEmoji: "🌻",
    weight: 15,
    eyeRing: "#FACC15",
    pupil: "#CA8A04",
    smile: "#EAB308",
    accent: "#EAB308",
  },
  green: {
    id: "green",
    labelKo: "초록",
    tierKo: "무난",
    tierEmoji: "🌿",
    weight: 13,
    eyeRing: "#4ADE80",
    pupil: "#15803D",
    smile: "#22C55E",
    accent: "#22C55E",
  },
  blue: {
    id: "blue",
    labelKo: "파랑",
    tierKo: "레어",
    tierEmoji: "💎",
    weight: 7,
    eyeRing: "#60A5FA",
    pupil: "#1D4ED8",
    smile: "#3B82F6",
    accent: "#3B82F6",
  },
  indigo: {
    id: "indigo",
    labelKo: "남색",
    tierKo: "레어",
    tierEmoji: "🌌",
    weight: 4,
    eyeRing: "#818CF8",
    pupil: "#4338CA",
    smile: "#6366F1",
    accent: "#6366F1",
  },
  purple: {
    id: "purple",
    labelKo: "보라",
    tierKo: "울트라레어",
    tierEmoji: "👑",
    weight: 1,
    eyeRing: "#C084FC",
    pupil: "#5B21B6",
    smile: "#C084FC",
    accent: "#8B5CF6",
  },
} as const;

export type GlangoAvatarVariantId = keyof typeof GLANGO_AVATAR_VARIANTS;

export type GlangoAvatarColors = {
  eyeRing: string;
  pupil: string;
  smile: string;
};

const VARIANT_ORDER: GlangoAvatarVariantId[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
];

export function isGlangoAvatarVariant(value: string): value is GlangoAvatarVariantId {
  return value in GLANGO_AVATAR_VARIANTS;
}

export function getAvatarVariant(id: GlangoAvatarVariantId) {
  return GLANGO_AVATAR_VARIANTS[id];
}

export function getAvatarColors(id: GlangoAvatarVariantId): GlangoAvatarColors {
  const variant = getAvatarVariant(id);
  return {
    eyeRing: variant.eyeRing,
    pupil: variant.pupil,
    smile: variant.smile,
  };
}

export function getAvatarAccent(id: GlangoAvatarVariantId) {
  return getAvatarVariant(id).accent;
}

/** Weighted roll: red 35 · orange 25 · yellow 15 · green 13 · blue 7 · indigo 4 · purple 1 */
export function rollGlangoAvatarVariant(random = Math.random()): GlangoAvatarVariantId {
  const roll = random * 100;
  let cumulative = 0;

  for (const id of VARIANT_ORDER) {
    cumulative += GLANGO_AVATAR_VARIANTS[id].weight;
    if (roll < cumulative) {
      return id;
    }
  }

  return "red";
}

export function isRarePurpleVariant(id: GlangoAvatarVariantId) {
  return id === "purple";
}

export function listAvatarOddsDisplay() {
  return VARIANT_ORDER.map((id) => {
    const variant = GLANGO_AVATAR_VARIANTS[id];
    return {
      id,
      labelKo: variant.labelKo,
      tierKo: variant.tierKo,
      tierEmoji: variant.tierEmoji,
      weight: variant.weight,
      accent: variant.accent,
      isUltraRare: id === "purple",
    };
  });
}

export function oddsHumanLine(variant: (typeof GLANGO_AVATAR_VARIANTS)[GlangoAvatarVariantId]) {
  if (variant.weight === 1) {
    return "100명 중 1명";
  }

  if (variant.weight <= 4) {
    return `약 ${Math.round(100 / variant.weight)}명 중 1명`;
  }

  return `${variant.weight}%`;
}
