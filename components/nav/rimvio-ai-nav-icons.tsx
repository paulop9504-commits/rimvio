import { cn } from "@/lib/utils";

type RimvioAiNavIconProps = {
  active?: boolean;
  className?: string;
};

function strokeColor(active?: boolean): string {
  return active ? "#1c1c1e" : "#8e8e93";
}

function AiMark({
  active,
  y = 13,
  size = 4.1,
}: {
  active?: boolean;
  y?: number;
  size?: number;
}) {
  return (
    <text
      x="12"
      y={y}
      textAnchor="middle"
      fontSize={size}
      fontWeight="700"
      fill={strokeColor(active)}
      stroke="none"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      AI
    </text>
  );
}

/** 지구 — wireframe globe + AI center mark */
export function RimvioNavGlobeIcon({ active, className }: RimvioAiNavIconProps) {
  const s = strokeColor(active);
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[22px]", className)} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke={s} strokeWidth="1.3" />
      <ellipse cx="12" cy="12" rx="3" ry="8.25" stroke={s} strokeWidth="1.15" />
      <path d="M4.25 12h15.5" stroke={s} strokeWidth="1.15" />
      <path d="M6.2 9.1h11.6" stroke={s} strokeWidth="0.95" opacity="0.5" />
      <path d="M6.2 14.9h11.6" stroke={s} strokeWidth="0.95" opacity="0.5" />
      <AiMark active={active} y={13.1} />
    </svg>
  );
}

/** 맞춤 — rounded square + AI */
export function RimvioNavFieldIcon({ active, className }: RimvioAiNavIconProps) {
  const s = strokeColor(active);
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[22px]", className)} fill="none" aria-hidden>
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2.75"
        stroke={s}
        strokeWidth="1.3"
      />
      <AiMark active={active} y={13.2} />
    </svg>
  );
}

/** 채팅 — person outline + AI */
export function RimvioNavChatIcon({ active, className }: RimvioAiNavIconProps) {
  const s = strokeColor(active);
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[22px]", className)} fill="none" aria-hidden>
      <circle cx="12" cy="8.25" r="2.85" stroke={s} strokeWidth="1.3" />
      <path
        d="M6.25 19.25v-0.85c0-2.9 2.35-5.25 5.75-5.25s5.75 2.35 5.75 5.25v0.85"
        stroke={s}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <AiMark active={active} y={14.8} size={3.6} />
    </svg>
  );
}

/** 기록 — magnifying glass + AI in lens */
export function RimvioNavRecordIcon({ active, className }: RimvioAiNavIconProps) {
  const s = strokeColor(active);
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[22px]", className)} fill="none" aria-hidden>
      <circle cx="10.75" cy="10.75" r="5.6" stroke={s} strokeWidth="1.3" />
      <path
        d="M15.1 15.1l4.15 4.15"
        stroke={s}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <AiMark active={active} y={11.8} size={3.8} />
    </svg>
  );
}
