import type { IdentityVaultBundle } from "@/lib/identity-vault/types";

export type LiteApiGuestPayload = {
  holder: {
    firstName: string;
    lastName: string;
    email: string;
  };
  guests: readonly {
    occupancyNumber: number;
    firstName: string;
    lastName: string;
    email: string;
  }[];
};

function splitRomanName(bundle: IdentityVaultBundle): {
  firstName: string;
  lastName: string;
} {
  const given = bundle.traveler?.givenNameRoman?.trim() ?? "";
  const family = bundle.traveler?.familyNameRoman?.trim() ?? "";
  if (given && family) {
    return { firstName: given, lastName: family };
  }
  const ko = bundle.traveler?.legalNameKo?.trim() ?? "";
  if (ko.length >= 2) {
    return { firstName: ko.slice(1), lastName: ko.slice(0, 1) };
  }
  return { firstName: "Guest", lastName: "Rimvio" };
}

export function buildLiteApiGuestPayload(
  bundle: IdentityVaultBundle,
): LiteApiGuestPayload | null {
  const email = bundle.contact?.email?.trim();
  if (!email) {
    return null;
  }
  const { firstName, lastName } = splitRomanName(bundle);
  return {
    holder: { firstName, lastName, email },
    guests: [
      {
        occupancyNumber: 1,
        firstName,
        lastName,
        email,
      },
    ],
  };
}
