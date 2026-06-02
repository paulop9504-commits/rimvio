import { GlangoBrandMark } from "@/lib/brand/glango-brand-mark";
import { GLANGO_NAV_LOGO_HEIGHT_PX } from "@/lib/brand/glango-logo-src";
import type { GlangoAvatarVariantId } from "@/lib/brand/glango-avatar-colors";

/** Feed tab icon — transparent brand mark sized for nav rail. */
export function GlangoFeedMark({
  className,
  filled = true,
  variant = null,
  testId = "glango-feed-mark",
}: {
  className?: string;
  filled?: boolean;
  variant?: GlangoAvatarVariantId | null;
  testId?: string;
}) {
  return (
    <GlangoBrandMark
      crisp
      size={GLANGO_NAV_LOGO_HEIGHT_PX}
      sizeAxis="height"
      dimmed={!filled}
      variant={variant}
      testId={testId}
      className={className}
    />
  );
}
