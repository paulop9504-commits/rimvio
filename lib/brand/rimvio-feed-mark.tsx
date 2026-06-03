import { RimvioBrandMark } from "@/lib/brand/rimvio-brand-mark";
import { RIMVIO_NAV_LOGO_HEIGHT_PX } from "@/lib/brand/rimvio-logo-src";
import type { RimvioAvatarVariantId } from "@/lib/brand/rimvio-avatar-colors";

/** Feed tab icon — transparent brand mark sized for nav rail. */
export function RimvioFeedMark({
  className,
  filled = true,
  variant = null,
  testId = "rimvio-feed-mark",
}: {
  className?: string;
  filled?: boolean;
  variant?: RimvioAvatarVariantId | null;
  testId?: string;
}) {
  return (
    <RimvioBrandMark
      crisp
      size={RIMVIO_NAV_LOGO_HEIGHT_PX}
      sizeAxis="height"
      dimmed={!filled}
      variant={variant}
      testId={testId}
      className={className}
    />
  );
}
