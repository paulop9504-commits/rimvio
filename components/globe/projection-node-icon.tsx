"use client";

import {
  BedDouble,
  Brain,
  FolderKanban,
  Info,
  LucideIcon,
  LucideProps,
  MessageCircleMore,
  Plane,
  Sparkles,
  Ticket,
  TrainFront,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type { ProjectionNodeIconToken } from "@/lib/situation-projection/projection-node-presentation";

const ICON_BY_TOKEN: Record<ProjectionNodeIconToken, LucideIcon> = {
  bed: BedDouble,
  brain: Brain,
  folder: FolderKanban,
  info: Info,
  message: MessageCircleMore,
  plane: Plane,
  sparkles: Sparkles,
  ticket: Ticket,
  train: TrainFront,
  users: Users,
  utensils: UtensilsCrossed,
  wallet: Wallet,
};

export function ProjectionNodeIcon({
  token,
  className,
}: {
  token: ProjectionNodeIconToken;
  className?: string;
}) {
  const Icon = ICON_BY_TOKEN[token] ?? Brain;
  return <Icon className={className} aria-hidden />;
}
