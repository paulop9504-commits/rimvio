"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  invokeExperienceResource,
  experienceBlueprintFromUtterance,
  type ExperienceBuildStep,
} from "@/lib/hub/dev/experience-os";
import type { AuthProviderState, TableColumn } from "@/lib/hub/dev/experience-os/adapters";
import { HubAskRimvioBar } from "@/components/hub/dev/hub-ask-rimvio-bar";
import { HubExperienceGraph } from "@/components/hub/dev/hub-experience-graph";
import { cn } from "@/lib/utils";

type SharedPaneProps = {
  readonly draft: PlatformDraft;
  readonly onAsk: (text: string) => void;
  readonly onDraftPatch?: (patch: Partial<PlatformDraft>) => void;
};

export function HubExperienceVerificationPane(props: SharedPaneProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    ok: boolean;
    readyToDeploy: boolean;
    layers: readonly { id: string; ok: boolean; detail: string; skipped?: boolean }[];
  } | null>(null);

  const run = () => {
    setBusy(true);
    setError(null);
    void invokeExperienceResource("verification.run", {}, { draft: props.draft }).then((result) => {
      setBusy(false);
      if (!result.ok) {
        setError(result.errorKo ?? "verification failed");
        return;
      }
      setReport(result.data as typeof report);
    });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first paint
  }, [props.draft.id]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Verification</p>
      <p className="mt-1 text-[12px] text-[#6b7280]">
        Playwright가 없어도 Typecheck · Lint · Build · Health · Smoke를 실행합니다.
      </p>
      {busy ? <p className="mt-4 text-[11px] text-[#9ca3af]">검증 중…</p> : null}
      {error ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
      {report ? (
        <ul className="mt-4 space-y-1.5">
          {report.layers.map((layer) => (
            <li
              key={layer.id}
              className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[11px] shadow-sm"
            >
              <span className="font-medium text-[#374151]">{layer.id}</span>
              <span className={cn(layer.ok ? "text-emerald-600" : "text-red-600")}>
                {layer.skipped ? "skipped" : layer.ok ? "✓" : "✕"} {layer.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {report ? (
        <p className={cn("mt-4 text-[13px] font-semibold", report.readyToDeploy ? "text-emerald-600" : "text-amber-700")}>
          {report.readyToDeploy ? "Ready to Deploy" : "Not ready — fix failing layers"}
        </p>
      ) : null}
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="mt-4 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
      >
        Run Verification
      </button>
      <HubAskRimvioBar placeholder="로그인 기능 테스트해줘" onAsk={props.onAsk} />
    </div>
  );
}

export function HubExperienceLogsPane(props: SharedPaneProps) {
  const [logs, setLogs] = useState<Array<{ at: string; message: string }>>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void invokeExperienceResource("log.list", {}, { draft: props.draft }).then((result) => {
      if (!result.ok) return;
      const data = result.data as { logs?: Array<{ at: string; message: string }> };
      setLogs(data.logs ?? []);
    });
  }, [props.draft]);

  const filtered = logs.filter((l) => !query || l.message.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Logs</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색"
        className="mt-2 w-full rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] focus:border-violet-400 focus:outline-none"
      />
      {filtered.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#6b7280]">아직 로그가 없습니다. Resource를 만들면 여기에 남습니다.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {filtered.map((log) => (
            <li key={`${log.at}-${log.message}`} className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 font-mono text-[10px] text-[#374151]">
              <span className="text-[#9ca3af]">{log.at.slice(11, 19)}</span> {log.message}
            </li>
          ))}
        </ul>
      )}
      <HubAskRimvioBar placeholder="최근 배포 로그 보여줘" onAsk={props.onAsk} />
    </div>
  );
}

export function HubExperienceUsersPane(props: SharedPaneProps) {
  const [users, setUsers] = useState<Array<{ name: string; email: string; role: string }>>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const reload = () => {
    void invokeExperienceResource("user.list", {}, { draft: props.draft }).then((result) => {
      if (!result.ok) return;
      const data = result.data as { users?: Array<{ name: string; email: string; role: string }> };
      setUsers(data.users ?? []);
    });
  };

  useEffect(() => {
    reload();
  }, [props.draft]);

  const visible = users.filter(
    (u) => !query || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Users</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름 · 이메일 · role"
        className="mt-2 w-full rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] focus:border-violet-400 focus:outline-none"
      />
      {visible.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#d1d5db] bg-white p-4">
          <p className="text-[12px] text-[#6b7280]">사용자가 없습니다. 운영자 계정을 추가하세요.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-1">
          {visible.map((user) => (
            <li key={user.email}>
              <button
                type="button"
                onClick={() => setSelected(user.email)}
                className="flex w-full items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-left text-[11px] shadow-sm hover:border-violet-200"
              >
                <span className="font-medium text-[#111827]">{user.name}</span>
                <span className="text-[#6b7280]">{user.role}</span>
              </button>
              {selected === user.email ? (
                <p className="px-3 py-2 text-[10px] text-[#6b7280]">{user.email}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          void invokeExperienceResource(
            "user.create",
            { name: "operator", role: "admin" },
            { draft: props.draft, updateDraft: props.onDraftPatch },
          ).then(reload);
        }}
        className="mt-4 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
      >
        Add User
      </button>
      <HubAskRimvioBar placeholder="판매자 계정을 추가해줘" onAsk={props.onAsk} />
    </div>
  );
}

export function HubExperienceSecretsPane(props: SharedPaneProps) {
  const [secrets, setSecrets] = useState<Array<{ name: string }>>([]);

  const reload = () => {
    void invokeExperienceResource("secret.list", {}, { draft: props.draft }).then((result) => {
      if (!result.ok) return;
      const data = result.data as { secrets?: Array<{ name: string }> };
      setSecrets(data.secrets ?? []);
    });
  };

  useEffect(() => {
    reload();
  }, [props.draft]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Secrets</p>
      <p className="mt-1 text-[11px] text-[#6b7280]">값은 브라우저에 평문으로 노출되지 않습니다.</p>
      {secrets.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#6b7280]">저장된 secret이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {secrets.map((secret) => (
            <li
              key={secret.name}
              className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 font-mono text-[11px]"
            >
              <span>{secret.name}</span>
              <span className="text-[#9ca3af]">••••••••</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          void invokeExperienceResource(
            "secret.set",
            { name: "OPENAI_API_KEY" },
            { draft: props.draft },
          ).then(reload);
        }}
        className="mt-4 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
      >
        Store Secret Name
      </button>
      <HubAskRimvioBar placeholder="결제 키를 안전하게 저장해줘" onAsk={props.onAsk} />
    </div>
  );
}

export function HubExperienceDomainsPane(props: SharedPaneProps) {
  const [domains, setDomains] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  const reload = () => {
    void invokeExperienceResource("domain.list", {}, { draft: props.draft }).then((result) => {
      if (!result.ok) return;
      const data = result.data as { domains?: string[] };
      setDomains(data.domains ?? []);
    });
  };

  useEffect(() => {
    reload();
  }, [props.draft]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Domains</p>
      {domains.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#6b7280]">기본 Rimvio 도메인이 곧 표시됩니다.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {domains.map((domain) => (
            <li
              key={domain}
              className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[11px]"
            >
              <span className="font-medium">{domain}</span>
              <span className="text-emerald-600">Connected</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-1.5">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="www.example.com"
          className="min-w-0 flex-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] focus:border-violet-400 focus:outline-none"
        />
        <button
          type="button"
          disabled={!custom.trim()}
          onClick={() => {
            void invokeExperienceResource(
              "domain.connect",
              { name: custom.trim() },
              { draft: props.draft },
            ).then(() => {
              setCustom("");
              reload();
            });
          }}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
        >
          Add Domain
        </button>
      </div>
      <HubAskRimvioBar placeholder="커스텀 도메인 연결해줘" onAsk={props.onAsk} />
    </div>
  );
}

export function HubExperienceBuildProgress(props: SharedPaneProps & { readonly onDone?: () => void }) {
  const [steps, setSteps] = useState<ExperienceBuildStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = steps.length
    ? Math.round((steps.filter((s) => s.status === "done").length / steps.length) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-violet-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold text-[#111827]">Building your Experience</p>
      <p className="mt-1 text-[20px] font-bold tabular-nums text-violet-700">{progress}%</p>
      {steps.length ? (
        <ul className="mt-2 space-y-1 text-[11px]">
          {steps.map((step) => (
            <li
              key={step.id}
              className={
                step.status === "done"
                  ? "text-emerald-600"
                  : step.status === "running"
                    ? "text-violet-700"
                    : step.status === "error"
                      ? "text-red-600"
                      : "text-[#9ca3af]"
              }
            >
              {step.status === "done" ? "✓" : step.status === "running" ? "●" : step.status === "error" ? "✕" : "○"}{" "}
              {step.label}
              {step.detail ? <span className="ml-1 text-[#9ca3af]">{step.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-[#6b7280]">Workspace · Database · Auth · Runtime · Verification</p>
      )}
      {error ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void invokeExperienceResource("experience.build", {}, {
            draft: props.draft,
            updateDraft: props.onDraftPatch,
          }).then((result) => {
            setBusy(false);
            const data = result.data as { steps?: ExperienceBuildStep[] };
            if (data.steps) setSteps(data.steps);
            if (!result.ok) {
              setError(result.errorKo ?? "Build failed");
              return;
            }
            props.onDone?.();
          });
        }}
        className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Building…" : "Build this Experience"}
      </button>
    </div>
  );
}

export function HubExperienceAuthPane(props: SharedPaneProps) {
  const [providers, setProviders] = useState<AuthProviderState[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  const reload = () => {
    void invokeExperienceResource("auth.listProviders", {}, { draft: props.draft }).then((result) => {
      if (!result.ok) return;
      setProviders((result.data as { providers?: AuthProviderState[] }).providers ?? []);
    });
    void invokeExperienceResource("auth.listRoles", {}, { draft: props.draft }).then((result) => {
      if (!result.ok) return;
      setRoles((result.data as { roles?: string[] }).roles ?? []);
    });
  };

  useEffect(() => {
    reload();
  }, [props.draft]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Authentication</p>
      <p className="mt-1 text-[12px] text-[#6b7280]">Providers · Roles — UI와 Agent가 같은 Resource API를 씁니다.</p>
      <ul className="mt-4 space-y-1.5">
        {providers.map((provider) => (
          <li
            key={provider.id}
            className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[11px]"
          >
            <span className="font-medium capitalize">{provider.id}</span>
            <button
              type="button"
              onClick={() => {
                void invokeExperienceResource(
                  "auth.updateProvider",
                  { id: provider.id, enabled: !provider.enabled },
                  { draft: props.draft, updateDraft: props.onDraftPatch },
                ).then(reload);
              }}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                provider.enabled ? "bg-emerald-50 text-emerald-700" : "bg-[#f3f4f6] text-[#9ca3af]",
              )}
            >
              {provider.enabled ? "On" : "Off"}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">Roles</p>
      {roles.length === 0 ? (
        <p className="mt-2 text-[12px] text-[#6b7280]">아직 role이 없습니다.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {roles.map((role) => (
            <li key={role} className="rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1 text-[10px]">
              {role}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          void invokeExperienceResource(
            "auth.createRole",
            { name: "seller" },
            { draft: props.draft, updateDraft: props.onDraftPatch },
          ).then(reload);
        }}
        className="mt-4 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white"
      >
        Add Seller Role
      </button>
      <HubAskRimvioBar placeholder="판매자와 구매자 role을 만들어줘" onAsk={props.onAsk} />
    </div>
  );
}

export function HubExperienceDatabasePane(props: SharedPaneProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [newName, setNewName] = useState("");

  const reload = () => {
    void invokeExperienceResource("database.listTables", {}, { draft: props.draft }).then((result) => {
      if (!result.ok) return;
      setTables((result.data as { tables?: string[] }).tables ?? []);
    });
  };

  useEffect(() => {
    reload();
  }, [props.draft]);

  const openTable = (name: string) => {
    setSelected(name);
    void invokeExperienceResource(
      "database.updateSchema",
      { name },
      { draft: props.draft, updateDraft: props.onDraftPatch },
    ).then((result) => {
      if (!result.ok) return;
      setColumns((result.data as { columns?: TableColumn[] }).columns ?? []);
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Database</p>
      {tables.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#d1d5db] bg-white p-4">
          <p className="text-[12px] text-[#6b7280]">No tables yet.</p>
          <p className="mt-1 text-[11px] text-[#9ca3af]">상품과 주문을 관리할 데이터베이스를 만들어줘.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-1">
          {tables.map((table) => (
            <li key={table}>
              <button
                type="button"
                onClick={() => openTable(table)}
                className={cn(
                  "w-full rounded-xl border bg-white px-3 py-2 text-left font-mono text-[11px]",
                  selected === table ? "border-violet-300" : "border-[#e5e7eb]",
                )}
              >
                {table}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && columns.length > 0 ? (
        <table className="mt-4 w-full overflow-hidden rounded-xl border border-[#e5e7eb] bg-white text-[11px]">
          <thead className="bg-[#f9fafb] text-[#6b7280]">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">name</th>
              <th className="px-3 py-1.5 text-left font-medium">type</th>
              <th className="px-3 py-1.5 text-left font-medium">required</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.name} className="border-t border-[#f3f4f6]">
                <td className="px-3 py-1.5 font-mono">{col.name}</td>
                <td className="px-3 py-1.5">{col.type}</td>
                <td className="px-3 py-1.5">{col.required ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div className="mt-4 flex gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="table name"
          className="min-w-0 flex-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] focus:border-violet-400 focus:outline-none"
        />
        <button
          type="button"
          disabled={!newName.trim()}
          onClick={() => {
            void invokeExperienceResource(
              "database.createTable",
              { name: newName.trim() },
              { draft: props.draft, updateDraft: props.onDraftPatch },
            ).then(() => {
              setNewName("");
              reload();
            });
          }}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
        >
          Create Table
        </button>
      </div>
      <HubAskRimvioBar placeholder="상품 테이블 만들어줘" onAsk={props.onAsk} />
    </div>
  );
}

export function HubExperienceRuntimePane(props: SharedPaneProps & { readonly onPreview?: () => void }) {
  const [status, setStatus] = useState<{
    status?: string;
    framework?: string;
    node?: string;
    port?: number;
    process?: string;
    adapter?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => {
    void invokeExperienceResource("runtime.status", {}, { draft: props.draft }).then((result) => {
      if (!result.ok) return;
      setStatus(result.data as typeof status);
    });
  };

  useEffect(() => {
    reload();
  }, [props.draft]);

  const run = (op: "runtime.start" | "runtime.stop" | "runtime.restart") => {
    setBusy(true);
    void invokeExperienceResource(op, {}, { draft: props.draft, updateDraft: props.onDraftPatch }).then((result) => {
      setBusy(false);
      if (result.ok) setStatus(result.data as typeof status);
    });
  };

  return (
    <div className="border-b border-[#e5e7eb] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Runtime</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div>
          <dt className="text-[#9ca3af]">Status</dt>
          <dd className="font-semibold text-[#111827]">{status?.status ?? "stopped"}</dd>
        </div>
        <div>
          <dt className="text-[#9ca3af]">Framework</dt>
          <dd>{status?.framework ?? "Next.js"}</dd>
        </div>
        <div>
          <dt className="text-[#9ca3af]">Node</dt>
          <dd>{status?.node ?? "22"}</dd>
        </div>
        <div>
          <dt className="text-[#9ca3af]">Process</dt>
          <dd className="font-mono">{status?.process ?? "idle"}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("runtime.start")}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
        >
          Start
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("runtime.restart")}
          className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
        >
          Restart
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("runtime.stop")}
          className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={props.onPreview}
          className="rounded-lg border border-violet-200 px-3 py-1.5 text-[11px] font-semibold text-violet-700"
        >
          Open Preview
        </button>
      </div>
      <HubAskRimvioBar placeholder="개발 서버 다시 시작해줘" onAsk={props.onAsk} />
    </div>
  );
}

export function HubExperienceOverviewExtras(props: SharedPaneProps) {
  const blueprint = useMemo(
    () => experienceBlueprintFromUtterance(`${props.draft.name} ${props.draft.description}`),
    [props.draft.name, props.draft.description],
  );
  return (
    <div className="space-y-2">
      <HubExperienceGraph blueprint={blueprint} onAsk={props.onAsk} />
      <HubExperienceBuildProgress draft={props.draft} onAsk={props.onAsk} onDraftPatch={props.onDraftPatch} />
    </div>
  );
}
