import { cn } from "@/lib/utils";
import {
  GLANGO_LOGO_ASPECT,
  GLANGO_LOGO_MARK_SRC,
  GLANGO_LOGO_WHITE_SRC,
} from "@/lib/brand/glango-logo-src";
import type { GlangoAvatarVariantId } from "@/lib/brand/glango-avatar-colors";

export { GLANGO_LOGO_MARK_SRC as GLANGO_LOGO_SRC } from "@/lib/brand/glango-logo-src";

/** Shared brand mark — Glango hand / neural logo. */
export function GlangoBrandMark({
  className,
  size,
  sizeAxis = "width",
  dimmed = false,
  crisp: _crisp = false,
  appearance = "dark",
  variant: _variant = null,
  testId,
}: {
  className?: string;
  size?: number;
  /** `width` = size is mark width; `height` = size is cap height (nav rail alignment). */
  sizeAxis?: "width" | "height";
  dimmed?: boolean;
  crisp?: boolean;
  /** `dark` = colorful; `white` = white on dark chrome; `light` = black on white chrome. */
  appearance?: "dark" | "white" | "light";
  variant?: GlangoAvatarVariantId | null;
  testId?: string;
}) {
  const box = size ?? undefined;
  const width =
    box && sizeAxis === "height" ? Math.round(box * GLANGO_LOGO_ASPECT) : box;
  const height =
    box && sizeAxis === "height"
      ? box
      : box
        ? Math.round(box / GLANGO_LOGO_ASPECT)
        : undefined;

  return (
    <span
      data-testid={testId}
      className={cn(
        "glango-brand-mark inline-flex shrink-0 items-center justify-center overflow-visible bg-transparent",
        !box && "size-full",
        className,
      )}
      style={box ? { width, height } : undefined}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={appearance === "white" ? GLANGO_LOGO_WHITE_SRC : GLANGO_LOGO_MARK_SRC}
        alt=""
        width={width}
        height={height}
        draggable={false}
        decoding="async"
        className={cn(
          "glango-brand-mark__img max-h-full max-w-full object-contain",
          appearance === "light" && "glango-brand-mark__img--on-light",
          dimmed && "opacity-45 saturate-[0.85]",
        )}
      />
    </span>
  );
}
