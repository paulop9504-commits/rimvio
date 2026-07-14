/**
 * Country / region labels — not city destinations (Execution Space law).
 */

const COUNTRY_OR_REGION =
  /^(?:일본|japan|한국|korea|남한|미국|usa|미국본토|중국|china|대만|taiwan|태국|thailand|베트남|vietnam|프랑스|france|영국|uk|영국본토|싱가포르|singapore|홍콩|hong\s*kong|홍콩섬)$/iu;

/** True when label is a country/region — city destination must stay unresolved. */
export function isCountryOrRegionDestinationLabel(label: string | null | undefined): boolean {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) {
    return false;
  }
  return COUNTRY_OR_REGION.test(trimmed);
}
