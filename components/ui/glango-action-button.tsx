"use client";

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { NavAuxBrandStyle } from "@/lib/brand/action-brand-style";
import { cn } from "@/lib/utils";

export type GlangoActionButtonVariant = "primary" | "secondary" | "ghost";
export type GlangoActionButtonLayout = "default" | "tile" | "pill" | "compact";

type GlangoActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: GlangoActionButtonVariant;
  layout?: GlangoActionButtonLayout;
  icon?: LucideIcon;
  iconSlot?: ReactNode;
  /** Brand-colored icon shell (secondary / AUX). */
  iconBrand?: NavAuxBrandStyle;
  hint?: string | null;
  trailing?: ReactNode;
  fullWidth?: boolean;
};

export function GlangoActionButton({
  variant = "primary",
  layout = "default",
  icon: Icon,
  iconSlot,
  iconBrand,
  hint,
  trailing,
  fullWidth = false,
  className,
  children,
  type = "button",
  ...props
}: GlangoActionButtonProps) {
  const isTile = layout === "tile";
  const isPill = layout === "pill";
  const isCompact = layout === "compact";

  return (
    <button
      type={type}
      className={cn(
        "glango-action-button",
        variant === "secondary" && "glango-action-button--secondary",
        variant === "ghost" && "glango-action-button--ghost",
        isTile && "glango-action-button--tile",
        isPill && "glango-action-button--pill",
        isCompact && "glango-action-button--compact",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {iconSlot ? (
        <span className="glango-action-button__icon" aria-hidden>
          {iconSlot}
        </span>
      ) : Icon ? (
        <span
          className={cn(
            "glango-action-button__icon",
            iconBrand && "glango-action-button__icon--brand",
          )}
          style={
            iconBrand
              ? { color: iconBrand.iconColor, backgroundColor: iconBrand.iconBg }
              : undefined
          }
          aria-hidden
        >
          <Icon className="size-[18px]" strokeWidth={2.15} />
        </span>
      ) : null}

      <span className="glango-action-button__content">
        <span className="glango-action-button__label">{children}</span>
        {hint ? <span className="glango-action-button__hint">{hint}</span> : null}
      </span>

      {trailing ? (
        <span className="glango-action-button__trailing" aria-hidden>
          {trailing}
        </span>
      ) : null}
    </button>
  );
}
