"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Settings } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import {
  EXPERIENCE_SERVICES,
  type ActivityRecord,
  type ExperienceAppRole,
} from "@/lib/experience-app";

export function ExperienceDrawer(props: {
  readonly open: boolean;
  readonly role: ExperienceAppRole;
  readonly activities: readonly ActivityRecord[];
  readonly inProgressCount: number;
  readonly onClose: () => void;
  readonly onRole: (role: ExperienceAppRole) => void;
  readonly onActivity: (activity: ActivityRecord) => void;
  readonly onNewChat: () => void;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/40" onClick={props.onClose}>
      <aside
        className="flex h-full w-[82%] max-w-[320px] flex-col bg-[#111318] text-[#f2f4f6]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="text-[16px] font-bold">{copy.brand.name}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 text-[13px]">
          <DrawerSection title={copy.experienceApp.mySpace} defaultOpen>
            <DrawerRow label="✦ 새 대화" onClick={props.onNewChat} />
            <DrawerRow label="◷ 최근 활동" muted />
            {props.activities.slice(0, 5).map((act) => (
              <DrawerRow
                key={act.id}
                label={`${act.kind === "order" ? "🛵" : "◦"} ${act.title}`}
                sub={act.statusLabel}
                indent
                onClick={() => props.onActivity(act)}
              />
            ))}
            <DrawerRow
              label={`🛵 ${copy.experienceApp.order}`}
              badge={props.inProgressCount > 0 ? copy.experienceApp.inProgress : undefined}
              indent
              active={props.role === "consumer"}
              onClick={() => props.onRole("consumer")}
            />
            <DrawerRow label={`🏨 ${copy.experienceApp.reservation}`} indent muted />
            <DrawerRow label={`🛍 ${copy.experienceApp.purchase}`} indent muted />
            <DrawerRow label={`✈ ${copy.experienceApp.travel}`} indent muted />
          </DrawerSection>

          <DrawerSection title={copy.experienceApp.myServices} defaultOpen>
            {EXPERIENCE_SERVICES.map((service) => (
              <ServiceTree
                key={service.id}
                label={service.nameKo}
                active={props.role === "merchant" && service.id === "local-delivery"}
                children={service.merchantNav.map((n) => n.labelKo)}
                onSelect={() => props.onRole("merchant")}
              />
            ))}
          </DrawerSection>
        </div>
        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            href="/hub/create"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-[#d1d5db]"
          >
            <Plus className="size-4" />
            {copy.experienceApp.createService}
          </Link>
          <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-[#9ca3af]">
            <Settings className="size-4" />
            {copy.nav.settings}
          </Link>
        </div>
      </aside>
    </div>
  );
}

function DrawerSection(props: {
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {props.title}
      </button>
      {open ? <div className="mt-0.5">{props.children}</div> : null}
    </div>
  );
}

function DrawerRow(props: {
  readonly label: string;
  readonly sub?: string;
  readonly badge?: string;
  readonly indent?: boolean;
  readonly active?: boolean;
  readonly muted?: boolean;
  readonly onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.muted && !props.onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg py-2 text-left",
        props.indent ? "pl-6 pr-2" : "px-2",
        props.active ? "bg-white/10 text-white" : props.muted ? "text-[#6b7280]" : "text-[#c5cad3]",
        props.onClick && "hover:bg-white/5",
      )}
    >
      <span className="min-w-0 truncate">{props.label}</span>
      {props.badge ? (
        <span className="rounded-full bg-violet-500/20 px-1.5 py-px text-[9px] text-violet-200">{props.badge}</span>
      ) : props.sub ? (
        <span className="text-[10px] text-[#6b7280]">{props.sub}</span>
      ) : null}
    </button>
  );
}

function ServiceTree(props: {
  readonly label: string;
  readonly active?: boolean;
  readonly children: readonly string[];
  readonly onSelect: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          props.onSelect();
          setOpen((v) => !v);
        }}
        className={cn(
          "flex w-full items-center gap-1 rounded-lg px-2 py-2 text-left",
          props.active ? "bg-white/10 text-white" : "text-[#c5cad3]",
        )}
      >
        {open ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
        <span>🍔 {props.label}</span>
      </button>
      {open
        ? props.children.map((child) => (
            <DrawerRow key={child} label={child} indent muted onClick={props.onSelect} />
          ))
        : null}
    </div>
  );
}
