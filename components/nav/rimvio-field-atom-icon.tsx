"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type RimvioFieldAtomIconProps = {
  active?: boolean;
  className?: string;
};

const CX = 12;
const CY = 12;
const RX = 3.85;
const RY = 1.82;
/** Nucleus radius — golden ratio vs orbit minor axis */
const NUCLEUS_R = RY / 1.618;

const ORBIT_ROTATIONS = [0, 60, 120] as const;

const SPARKLE_ORBITS: ReadonlyArray<{
  orbitIndex: number;
  size: number;
  duration: number;
  begin: string;
}> = [
  { orbitIndex: 0, size: 0.52, duration: 3.4, begin: "0s" },
  { orbitIndex: 1, size: 0.38, duration: 5.1, begin: "-1.2s" },
  { orbitIndex: 2, size: 0.28, duration: 6.8, begin: "-2.4s" },
];

function strokeColor(active?: boolean): string {
  return active ? "#1c1c1e" : "#8e8e93";
}

function ellipsePath(rx: number, ry: number): string {
  const left = CX - rx;
  const right = CX + rx;
  return `M ${left} ${CY} A ${rx} ${ry} 0 1 1 ${right} ${CY} A ${rx} ${ry} 0 1 1 ${left} ${CY}`;
}

/** Bottom (front) semicircle — thick stroke */
function orbitFrontArc(rx: number, ry: number): string {
  const left = CX - rx;
  const right = CX + rx;
  return `M ${left} ${CY} A ${rx} ${ry} 0 0 1 ${right} ${CY}`;
}

/** Top (back) semicircle — thin stroke */
function orbitBackArc(rx: number, ry: number): string {
  const right = CX + rx;
  const left = CX - rx;
  return `M ${right} ${CY} A ${rx} ${ry} 0 0 1 ${left} ${CY}`;
}

function SparklePath({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const tip = size;
  const notch = size * 0.28;
  return (
    <path
      d={`M ${cx} ${cy - tip} L ${cx + notch} ${cy - notch} L ${cx + tip} ${cy} L ${cx + notch} ${cy + notch} L ${cx} ${cy + tip} L ${cx - notch} ${cy + notch} L ${cx - tip} ${cy} L ${cx - notch} ${cy - notch} Z`}
      fill="currentColor"
    />
  );
}

function OrbitLayer({
  rotation,
  stroke,
  thick,
  thin,
}: {
  rotation: number;
  stroke: string;
  thick: number;
  thin: number;
}) {
  return (
    <g transform={`rotate(${rotation} ${CX} ${CY})`}>
      <path
        d={orbitBackArc(RX, RY)}
        stroke={stroke}
        strokeWidth={thin}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={orbitFrontArc(RX, RY)}
        stroke={stroke}
        strokeWidth={thick}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

/** Atom logo clipped inside 맞춤 rounded square */
export function RimvioFieldAtomIcon({ active, className }: RimvioFieldAtomIconProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const clipId = `rimvio-field-atom-clip-${uid}`;
  const stroke = strokeColor(active);
  const animate = !reduceMotion;
  const thick = active ? 1.35 : 1.15;
  const thin = active ? 0.42 : 0.38;

  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={cn("size-[27px]", className)}
      fill="none"
      aria-hidden
      initial={false}
      whileTap={{ scale: 0.9 }}
      animate={{ scale: active ? 1.04 : 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="6.55" y="6.55" width="10.9" height="10.9" rx="2.45" />
        </clipPath>
        {ORBIT_ROTATIONS.map((rotation, index) => (
          <path
            key={`orbit-path-${rotation}`}
            id={`${clipId}-orbit-${index}`}
            d={ellipsePath(RX, RY)}
            transform={`rotate(${rotation} ${CX} ${CY})`}
          />
        ))}
      </defs>

      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2.75"
        stroke={stroke}
        strokeWidth="1.3"
        fill="#faf9f7"
      />

      <g clipPath={`url(#${clipId})`} style={{ color: stroke }}>
        {ORBIT_ROTATIONS.map((rotation) => (
          <OrbitLayer
            key={rotation}
            rotation={rotation}
            stroke={stroke}
            thick={thick}
            thin={thin}
          />
        ))}

        <circle cx={CX} cy={CY} r={NUCLEUS_R} fill={stroke} />

        {SPARKLE_ORBITS.map((sparkle, index) => {
          const pathId = `${clipId}-orbit-${sparkle.orbitIndex}`;
          const staticAngle = [2.35, 5.1, 0.65][index] ?? 0;
          const orbitRotation = ORBIT_ROTATIONS[sparkle.orbitIndex] ?? 0;

          if (!animate) {
            const rad = (orbitRotation * Math.PI) / 180;
            const lx = RX * Math.cos(staticAngle);
            const ly = RY * Math.sin(staticAngle);
            const gx = CX + lx * Math.cos(rad) - ly * Math.sin(rad);
            const gy = CY + lx * Math.sin(rad) + ly * Math.cos(rad);
            return (
              <g key={`sparkle-static-${index}`} transform={`translate(${gx} ${gy})`}>
                <SparklePath cx={0} cy={0} size={sparkle.size} />
              </g>
            );
          }

          return (
            <g key={`sparkle-motion-${index}`} fill="currentColor">
              <g transform={`translate(${-sparkle.size} ${-sparkle.size})`}>
                <SparklePath cx={sparkle.size} cy={sparkle.size} size={sparkle.size} />
              </g>
              <animateMotion
                dur={`${sparkle.duration}s`}
                begin={sparkle.begin}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </g>
          );
        })}
      </g>
    </motion.svg>
  );
}
