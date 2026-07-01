"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RimvioFieldAtomIcon } from "@/components/nav/rimvio-field-atom-icon";
import { cn } from "@/lib/utils";

type RimvioAiNavIconProps = {
  active?: boolean;
  className?: string;
};

function strokeColor(active?: boolean): string {
  return active ? "#1c1c1e" : "#8e8e93";
}

const tapSpring = { type: "spring" as const, stiffness: 520, damping: 28 };

function AiMark({
  active,
  y = 13,
  size = 4.1,
}: {
  active?: boolean;
  y?: number;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.text
      x="12"
      y={y}
      textAnchor="middle"
      fontSize={size}
      fontWeight="700"
      fill={strokeColor(active)}
      stroke="none"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      animate={
        active && !reduceMotion
          ? { opacity: [0.72, 1, 0.72] }
          : { opacity: 1 }
      }
      transition={
        active && !reduceMotion
          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
      }
    >
      AI
    </motion.text>
  );
}

function NavIconShell({
  active,
  className,
  children,
}: {
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={cn("size-[22px]", className)}
      fill="none"
      aria-hidden
      initial={false}
      whileTap={{ scale: 0.9 }}
      animate={{ scale: active ? 1.04 : 1 }}
      transition={tapSpring}
    >
      {children}
    </motion.svg>
  );
}

/** 지구 — wireframe globe spins slowly when active */
export function RimvioNavGlobeIcon({ active, className }: RimvioAiNavIconProps) {
  const reduceMotion = useReducedMotion();
  const s = strokeColor(active);

  return (
    <NavIconShell active={active} className={className}>
      <motion.g
        animate={active && !reduceMotion ? { rotate: 360 } : { rotate: 0 }}
        transition={
          active && !reduceMotion
            ? { duration: 14, repeat: Infinity, ease: "linear" }
            : { duration: 0.35 }
        }
        style={{ transformOrigin: "12px 12px" }}
      >
        <circle cx="12" cy="12" r="8.25" stroke={s} strokeWidth="1.3" />
        <ellipse cx="12" cy="12" rx="3" ry="8.25" stroke={s} strokeWidth="1.15" />
        <path d="M4.25 12h15.5" stroke={s} strokeWidth="1.15" />
        <path d="M6.2 9.1h11.6" stroke={s} strokeWidth="0.95" opacity="0.5" />
        <path d="M6.2 14.9h11.6" stroke={s} strokeWidth="0.95" opacity="0.5" />
        <AiMark active={active} y={13.1} />
      </motion.g>
    </NavIconShell>
  );
}

/** 맞춤 — atom animation inside rounded square */
export function RimvioNavFieldIcon({ active, className }: RimvioAiNavIconProps) {
  return <RimvioFieldAtomIcon active={active} className={className} />;
}

/** 채팅 — head bobs gently when active */
export function RimvioNavChatIcon({ active, className }: RimvioAiNavIconProps) {
  const reduceMotion = useReducedMotion();
  const s = strokeColor(active);

  return (
    <NavIconShell active={active} className={className}>
      <motion.g
        animate={
          active && !reduceMotion
            ? { y: [0, -0.55, 0] }
            : { y: 0 }
        }
        transition={
          active && !reduceMotion
            ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.25 }
        }
      >
        <circle cx="12" cy="8.25" r="2.85" stroke={s} strokeWidth="1.3" />
        <path
          d="M6.25 19.25v-0.85c0-2.9 2.35-5.25 5.75-5.25s5.75 2.35 5.75 5.25v0.85"
          stroke={s}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </motion.g>
      <AiMark active={active} y={14.8} size={3.6} />
    </NavIconShell>
  );
}

/** 기록 — lens sweeps when active */
export function RimvioNavRecordIcon({ active, className }: RimvioAiNavIconProps) {
  const reduceMotion = useReducedMotion();
  const s = strokeColor(active);

  return (
    <NavIconShell active={active} className={className}>
      <motion.g
        animate={
          active && !reduceMotion
            ? { x: [0, 0.35, 0, -0.25, 0], y: [0, -0.2, 0, 0.15, 0] }
            : { x: 0, y: 0 }
        }
        transition={
          active && !reduceMotion
            ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.25 }
        }
      >
        <circle cx="10.75" cy="10.75" r="5.6" stroke={s} strokeWidth="1.3" />
        <path
          d="M15.1 15.1l4.15 4.15"
          stroke={s}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <AiMark active={active} y={11.8} size={3.8} />
      </motion.g>
    </NavIconShell>
  );
}
