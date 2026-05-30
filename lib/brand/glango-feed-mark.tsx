import { GlangoBrandMark } from "@/lib/brand/glango-brand-mark";
import type { GlangoAvatarVariantId } from "@/lib/brand/glango-avatar-colors";
import { cn } from "@/lib/utils";

/** Feed tab icon — same vector logo as GlangoLogo, tinted to the user's Glango color. */
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
      dimmed={!filled}
      variant={variant}
      testId={testId}
      className={cn("size-[1.95rem]", className)}
    />
  );
}
