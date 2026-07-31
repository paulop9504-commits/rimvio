"use client";

/**
 * Workspace Peek / carousel image — uses Vercel Image Optimization when host allowed.
 */

import Image from "next/image";
import { canOptimizeWorkspaceRemoteImage } from "@/lib/context-workspace/can-optimize-workspace-remote-image";
import { cn } from "@/lib/utils";

export type WorkspaceRemoteImageProps = {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function WorkspaceRemoteImage({
  src,
  alt = "",
  className,
  sizes = "(max-width: 420px) 40vw, 160px",
  priority = false,
}: WorkspaceRemoteImageProps) {
  const optimize = canOptimizeWorkspaceRemoteImage(src);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!optimize}
      className={cn("object-cover", className)}
    />
  );
}
