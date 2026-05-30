import { GLANGO } from "@/lib/brand/glango";
import { GlangoBrandMark } from "@/lib/brand/glango-brand-mark";
import { cn } from "@/lib/utils";

const SIZE = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 52,
  xl: 72,
} as const;

type GlangoLogoProps = {
  size?: keyof typeof SIZE;
  className?: string;
  framed?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  showKo?: boolean;
};

function GlangoWordmark({
  className,
  showKo = false,
}: {
  className?: string;
  showKo?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span
        className={cn(
          "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500",
          "bg-clip-text text-sm font-bold tracking-tight text-transparent",
          "drop-shadow-sm"
        )}
      >
        {GLANGO.name}
      </span>
      {showKo ? (
        <span className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
          {GLANGO.nameKo}
        </span>
      ) : null}
    </span>
  );
}

export function GlangoLogo({
  size = "sm",
  className,
  framed = false,
  showWordmark = false,
  wordmarkClassName,
  showKo = false,
}: GlangoLogoProps) {
  const pixels = SIZE[size];

  const mark = (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        framed &&
          "rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/[0.06]",
        className
      )}
    >
      <GlangoBrandMark size={pixels} crisp={pixels <= 32} />
    </span>
  );

  if (!showWordmark) {
    return mark;
  }

  return (
    <span className="inline-flex items-center gap-2">
      {mark}
      <GlangoWordmark className={wordmarkClassName} showKo={showKo} />
    </span>
  );
}

/** @deprecated use GlangoLogo */
export const BlinkEyeLogo = GlangoLogo;
