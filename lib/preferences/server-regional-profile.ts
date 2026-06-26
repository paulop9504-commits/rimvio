import { cookies } from "next/headers";
import { isCountryCode, type CountryCode } from "@/lib/links/spark-locale";
import { HOME_COUNTRY_COOKIE } from "@/lib/preferences/home-country";
import { resolveRegionalProfile, type RegionalProfile } from "@/lib/preferences/regional-profile";

export { HOME_COUNTRY_COOKIE };

export async function getServerRegionalProfile(): Promise<RegionalProfile> {
  const jar = await cookies();
  const raw = jar.get(HOME_COUNTRY_COOKIE)?.value?.trim() ?? "";
  const country: CountryCode | null = isCountryCode(raw) ? raw : null;
  return resolveRegionalProfile(country);
}
