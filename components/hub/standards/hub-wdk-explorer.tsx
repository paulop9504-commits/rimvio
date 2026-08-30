"use client";

import {
  listDomainOntologySchemas,
  listViewContracts,
  MAP_VIEW_CONTRACT,
  RIMVIO_PRODUCER_KIND_SPECS,
  WORKSPACE_LAYER_SPECS,
  type DomainOntologySchema,
} from "@/lib/workspace-engine";

type HubWdkExplorerProps = {
  readonly highlight?: "layers" | "ontology" | "map";
};

/** Interactive WDK reference — layers, seed ontologies, Map View contract. */
export function HubWdkExplorer({ highlight }: HubWdkExplorerProps) {
  const ontologies = listDomainOntologySchemas();
  const contracts = listViewContracts();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h3 className="text-[14px] font-semibold text-[#0f172a]">Workspace 3층</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.values(WORKSPACE_LAYER_SPECS).map((layer) => (
            <div
              key={layer.id}
              className={
                highlight === "layers"
                  ? "rounded-lg border border-violet-200 bg-violet-50/50 p-3"
                  : "rounded-lg border border-[#E2E8F0] bg-[#f8fafc] p-3"
              }
            >
              <p className="text-[11px] font-semibold uppercase text-violet-600">{layer.titleKo}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#64748b]">{layer.descriptionKo}</p>
              <ul className="mt-2 space-y-0.5">
                {layer.examplesKo.map((ex) => (
                  <li key={ex} className="font-mono text-[10px] text-[#475569]">
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h3 className="text-[14px] font-semibold text-[#0f172a]">4 Producer 종류</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.values(RIMVIO_PRODUCER_KIND_SPECS).map((p) => (
            <div key={p.kind} className="rounded-lg border border-[#E2E8F0] px-3 py-2">
              <p className="text-[12px] font-semibold text-[#0f172a]">{p.titleKo}</p>
              <p className="text-[11px] text-[#64748b]">{p.questionKo}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className={
          highlight === "map"
            ? "rounded-xl border border-violet-200 bg-violet-50/30 p-5"
            : "rounded-xl border border-[#E2E8F0] bg-white p-5"
        }
      >
        <h3 className="text-[14px] font-semibold text-[#0f172a]">View Contracts</h3>
        {contracts.map((c) => (
          <div key={c.kind} className="mt-3">
            <p className="font-mono text-[11px] font-semibold text-violet-700">{c.kind} v{c.version}</p>
            <p className="mt-1 text-[12px] text-[#64748b]">{c.summaryKo}</p>
            {c.kind === "map" ? (
              <dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#64748b]">Events</dt>
                  <dd className="text-[#475569]">{MAP_VIEW_CONTRACT.events.map((e) => e.id).join(" · ")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#64748b]">Actions</dt>
                  <dd className="text-[#475569]">{MAP_VIEW_CONTRACT.actions.map((a) => a.id).join(" · ")}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        ))}
      </section>

      <section
        className={
          highlight === "ontology"
            ? "rounded-xl border border-violet-200 bg-violet-50/30 p-5"
            : "rounded-xl border border-[#E2E8F0] bg-white p-5"
        }
      >
        <h3 className="text-[14px] font-semibold text-[#0f172a]">등록된 Domain Ontology</h3>
        <div className="mt-3 space-y-3">
          {ontologies.map((schema) => (
            <OntologyCard key={schema.schemaId} schema={schema} />
          ))}
        </div>
      </section>
    </div>
  );
}

function OntologyCard({ schema }: { schema: DomainOntologySchema }) {
  return (
    <article className="rounded-lg border border-[#E2E8F0] bg-[#f8fafc] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] text-[#94a3b8]">{schema.schemaId}</p>
          <p className="text-[13px] font-semibold text-[#0f172a]">{schema.titleKo}</p>
        </div>
        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-violet-700">
          {schema.verificationStatus}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-[#64748b]">
        Objects: {schema.objectTypes.map((o) => o.typeId).join(" · ")}
      </p>
      <p className="mt-1 text-[10px] text-[#94a3b8]">
        Relations: {schema.relations.map((r) => `${r.fromType}→${r.kind}→${r.toType}`).join(" | ")}
      </p>
    </article>
  );
}
