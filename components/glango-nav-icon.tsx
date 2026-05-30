import { GlangoFeedMark } from "@/lib/brand/glango-feed-mark";
import { cn } from "@/lib/utils";

export function GlangoNavIcon({
  className,
  active = true,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <GlangoFeedMark
      filled={active}
      className={cn("size-[1.65rem]", className)}
    />
  );
}
