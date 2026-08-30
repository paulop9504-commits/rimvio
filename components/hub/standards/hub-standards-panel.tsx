"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { HubStandardRuleCard } from "@/components/hub/standards/hub-standard-rule-card";
import { HubStandardsChecklist } from "@/components/hub/standards/hub-standards-checklist";
import { HubWdkExplorer } from "@/components/hub/standards/hub-wdk-explorer";
import { HubTrustPipelineExplorer } from "@/components/hub/standards/hub-trust-pipeline-explorer";
import {
  CAPABILITY_STANDARD,
  CERTIFICATION_LEVELS,
  HUB_STANDARDS_NAV,
  MAIN_AGENT_CAPABILITY_POLICY,
  RIMVIO_CAPABILITY_STANDARD_VERSION,
  resolveStandardById,
  searchStandards,
  type HubStandardsView,
  type StandardDefinition,
} from "@/lib/hub/standards";
import { cn } from "@/lib/utils";

type HubStandardsPanelProps = {
  readonly initialView?: HubStandardsView;
  readonly embedded?: boolean;
};

export function HubStandardsPanel({ initialView = "overview", embedded }: HubStandardsPanelProps) {
  const [view, setView] = useState<HubStandardsView>(initialView);
  const [query, setQuery] = useState("");

  const activeStandard = resolveStandardById(view);
  const searchResults = useMemo(() => searchStandards(query), [query]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        embedded ? "bg-[#f8fafc]" : "bg-[#f4f5f7]",
      )}
    >
      <header className="shrink-0 border-b border-[#E2E8F0] bg-white px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
          Capability Standards · v{RIMVIO_CAPABILITY_STANDARD_VERSION}
        </p>
        <h1 className="mt-1 text-[20px] font-bold text-[#0f172a]">Producer / Reviewer Standards</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#64748b]">
          Rimvio 생태계에서 Capability를 제작·검수할 때 적용되는 공식 작업 표준입니다. Agent와
          Validation 시스템도 동일 정의를 사용합니다.
        </p>

        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="표준 검색…"
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#f8fafc] py-2 pl-9 pr-3 text-[13px] text-[#0f172a] placeholder:text-[#94a3b8] focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-52 shrink-0 overflow-y-auto border-r border-[#E2E8F0] bg-white p-3 rimvio-scroll-touch">
          {HUB_STANDARDS_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                "mb-0.5 w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors",
                view === item.id
                  ? "bg-violet-50 text-violet-700"
                  : "text-[#64748b] hover:bg-[#f8fafc]",
              )}
            >
              {item.labelKo}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-6 rimvio-scroll-touch">
          {query.trim() ? (
            <SearchResults results={searchResults} onSelect={(id) => { setView(id); setQuery(""); }} />
          ) : view === "overview" ? (
            <StandardsOverview onSelect={setView} />
          ) : view === "wdk_overview" ? (
            <div className="mx-auto max-w-3xl space-y-6">
              {activeStandard ? <StandardDetail standard={activeStandard} /> : null}
              <HubWdkExplorer highlight="layers" />
            </div>
          ) : view === "trust_pipeline" ? (
            <div className="mx-auto max-w-3xl">
              <HubTrustPipelineExplorer />
            </div>
          ) : activeStandard ? (
            <StandardDetail standard={activeStandard} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function StandardsOverview({ onSelect }: { onSelect: (v: HubStandardsView) => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h2 className="text-[16px] font-semibold text-[#0f172a]">{CAPABILITY_STANDARD.titleKo}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#64748b]">{CAPABILITY_STANDARD.summaryKo}</p>
        <button
          type="button"
          onClick={() => onSelect("capability_standard")}
          className="mt-4 text-[12px] font-semibold text-violet-600 hover:underline"
        >
          전체 표준 보기 →
        </button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <OverviewCard
          title="Workspace Dev Kit"
          description="Data · Object · View 3층 · 4 Producer · View Contract"
          onClick={() => onSelect("wdk_overview")}
        />
        <OverviewCard
          title="Capability Producer"
          description="제작·수정 시 Checklist · Reuse Before Create"
          onClick={() => onSelect("producer_guide")}
        />
        <OverviewCard
          title="Reviewer Guide"
          description="평가 기준 · Score · PASS / FAIL"
          onClick={() => onSelect("reviewer_guide")}
        />
        <OverviewCard
          title="Contract Standard"
          description="Input/Output Schema · Side Effect · Permissions"
          onClick={() => onSelect("contract_standard")}
        />
        <OverviewCard
          title="Certification"
          description="UNVERIFIED → TESTED → VERIFIED → Staging → Canary → TRUSTED"
          onClick={() => onSelect("certification_standard")}
        />
        <OverviewCard
          title="Trust Pipeline"
          description="제출은 열리되 실행은 막힘 · PASS ≠ Production"
          onClick={() => onSelect("trust_pipeline")}
        />
      </div>

      <section className="rounded-xl border border-violet-100 bg-violet-50/80 p-5">
        <h3 className="text-[14px] font-semibold text-violet-900">Main Agent Policy</h3>
        <ul className="mt-3 space-y-1.5">
          {MAIN_AGENT_CAPABILITY_POLICY.rulesKo.map((rule) => (
            <li key={rule} className="text-[12px] text-violet-800">
              · {rule}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function OverviewCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-left transition-shadow hover:shadow-sm"
    >
      <p className="text-[14px] font-semibold text-[#0f172a]">{title}</p>
      <p className="mt-1 text-[12px] text-[#64748b]">{description}</p>
    </button>
  );
}

function StandardDetail({ standard }: { standard: StandardDefinition }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase text-[#94a3b8]">
          v{standard.version} · {standard.role} · {standard.effectiveDateIso}
        </p>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">{standard.titleKo}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#64748b]">{standard.summaryKo}</p>
      </header>

      {standard.sections.map((section) => (
        <section key={section.id} className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <h3 className="text-[14px] font-semibold text-[#0f172a]">{section.titleKo}</h3>
          {section.descriptionKo ? (
            <p className="mt-2 text-[12px] leading-relaxed text-[#64748b]">{section.descriptionKo}</p>
          ) : null}

          {section.bullets && section.bullets.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {section.bullets.map((b, i) =>
                b === "---" ? (
                  <li key={`sep-${i}`} className="border-t border-[#E2E8F0] pt-2" aria-hidden />
                ) : (
                  <li key={b} className="text-[12px] text-[#475569]">
                    · {b}
                  </li>
                ),
              )}
            </ul>
          ) : null}

          {section.rules?.map((rule) => (
            <div key={rule.id} className="mt-4">
              <HubStandardRuleCard rule={rule} />
            </div>
          ))}

          {section.checklist && section.checklist.length > 0 ? (
            <div className="mt-4">
              <HubStandardsChecklist
                storageKey={`hub-standards-${standard.id}-${section.id}`}
                items={section.checklist}
              />
            </div>
          ) : null}
        </section>
      ))}

      {standard.id === "certification_standard" ? (
        <CertificationLadder />
      ) : null}
    </div>
  );
}

function CertificationLadder() {
  return (
    <div className="space-y-2">
      {CERTIFICATION_LEVELS.map((level, i) => (
        <div
          key={level.level}
          className="flex gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4"
        >
          <div className="flex flex-col items-center">
            <span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
              {i + 1}
            </span>
            {i < CERTIFICATION_LEVELS.length - 1 ? (
              <span className="mt-1 h-6 w-px bg-[#E2E8F0]" aria-hidden />
            ) : null}
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold text-violet-600">{level.level}</p>
            <p className="text-[13px] font-semibold text-[#0f172a]">{level.titleKo}</p>
            <p className="mt-1 text-[12px] text-[#64748b]">{level.descriptionKo}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchResults({
  results,
  onSelect,
}: {
  results: readonly StandardDefinition[];
  onSelect: (id: HubStandardsView) => void;
}) {
  if (results.length === 0) {
    return <p className="text-[13px] text-[#94a3b8]">검색 결과 없음</p>;
  }
  return (
    <ul className="mx-auto max-w-3xl space-y-2">
      {results.map((std) => (
        <li key={std.id}>
          <button
            type="button"
            onClick={() => onSelect(std.id as HubStandardsView)}
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-left hover:border-violet-200"
          >
            <p className="text-[13px] font-semibold text-[#0f172a]">{std.titleKo}</p>
            <p className="mt-0.5 text-[12px] text-[#64748b]">{std.summaryKo}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Compact link row for settings / headers */
export function HubStandardsLinkRow({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-xl bg-[#f8fafc] px-3 py-3 transition-colors hover:bg-violet-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-[#0f172a]">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[12px] text-[#64748b]">{subtitle}</span>
        ) : null}
      </span>
      <span className="text-[12px] font-semibold text-violet-600">열기 →</span>
    </Link>
  );
}
