import { GlangoSmileyMark } from "@/lib/brand/glango-smiley-mark";
import type { GlangoAvatarVariantId } from "@/lib/brand/glango-avatar-colors";
import { cn } from "@/lib/utils";

export { GLANGO_LOGO_SRC } from "@/lib/brand/glango-smiley-mark";

/** Shared brand mark — crisp vector SVG for logo + feed tab. */
export function GlangoBrandMark({
  className,
  size,
  dimmed = false,
  crisp = false,
  variant = null,
  testId,
}: {
  className?: string;
  size?: number;
  dimmed?: boolean;
  crisp?: boolean;
  variant?: GlangoAvatarVariantId | null;
  testId?: string;
}) {
  return (
    <GlangoSmileyMark
      pixels={size}
      crisp={crisp}
      variant={variant}
      testId={testId}
      className={cn(
        dimmed && "opacity-45 saturate-[0.85]",
        className
      )}
    />
  );
}
