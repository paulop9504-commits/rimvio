/**
 * Shared Resource API — UI and Operator Agent call the same ops.
 * Adapters: draft JSON + session overlay now; real infra later.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { buildDevBlueprintModel } from "@/lib/hub/dev/dev-blueprint-model";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import {
  appendExperienceLog,
  listExperienceResources,
  resourcesOfType,
  upsertExperienceResource,
} from "@/lib/hub/dev/experience-os/resource-store";
import { infrastructureForCapability } from "@/lib/hub/dev/experience-os/capability-infra";
import type {
  ExperienceResourceOp,
  ExperienceResourceResult,
  RimvioResource,
} from "@/lib/hub/dev/experience-os/types";
import { runExperienceVerification } from "@/lib/hub/dev/experience-os/verification-engine";
import { invokePlatformCapability } from "@/lib/hub/dev/experience-os/invoke-capability";
import { applyExperienceBlueprintToDraft } from "@/lib/hub/dev/experience-os/apply-blueprint";
import { experienceBlueprintFromUtterance } from "@/lib/hub/dev/experience-os/experience-blueprint";

export type ExperienceResourceContext = {
  readonly draft: PlatformDraft;
  readonly updateDraft?: (patch: Partial<PlatformDraft>) => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseCollections(draft: PlatformDraft): Array<{ name: string; schema?: string }> {
  try {
    const raw = JSON.parse(draft.dataCollectionsJson || "[]") as Array<{ name?: string; schema?: string }>;
    return raw.filter((r) => r.name).map((r) => ({ name: r.name!, schema: r.schema }));
  } catch {
    return [];
  }
}

function resource(
  projectId: string,
  type: RimvioResource["type"],
  name: string,
  extra?: Record<string, unknown>,
): RimvioResource {
  const id = `${type}:${name}`;
  return {
    id,
    projectId,
    type,
    name,
    status: "ready",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    meta: extra,
  };
}

export async function invokeExperienceResource(
  op: ExperienceResourceOp,
  args: Record<string, unknown>,
  ctx: ExperienceResourceContext,
): Promise<ExperienceResourceResult> {
  const projectId = ctx.draft.id;
  const snapshot = buildProjectSnapshot({ draft: ctx.draft });
  const model = buildDevBlueprintModel({ draft: ctx.draft, snapshot });

  try {
    switch (op) {
      case "workspace.read":
        return {
          ok: true,
          op,
          data: {
            platformId: projectId,
            name: ctx.draft.name,
            capabilities: ctx.draft.actions.map((a) => a.name),
            tables: parseCollections(ctx.draft).map((c) => c.name),
          },
        };
      case "database.listTables": {
        const fromDraft = parseCollections(ctx.draft).map((c) => c.name);
        const overlay = resourcesOfType(projectId, "database_table").map((r) => r.name);
        const inferred = fromDraft.length ? fromDraft : [...model.dataEntities];
        return { ok: true, op, data: { tables: [...new Set([...inferred, ...overlay])] } };
      }
      case "database.createTable": {
        const name = String(args.name ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "테이블 이름이 필요합니다." };
        const existing = parseCollections(ctx.draft);
        if (!existing.some((c) => c.name === name)) {
          ctx.updateDraft?.({
            dataCollectionsJson: JSON.stringify([
              ...existing,
              { name, schema: `${name}.v1`, pii: false },
            ]),
          });
        }
        upsertExperienceResource(resource(projectId, "database_table", name));
        appendExperienceLog(projectId, `Database table ${name} created`);
        return { ok: true, op, data: { name } };
      }
      case "storage.listBuckets": {
        const overlay = resourcesOfType(projectId, "storage_bucket").map((r) => r.name);
        const defaults = overlay.length ? overlay : ["uploads", "avatars"];
        return { ok: true, op, data: { buckets: defaults } };
      }
      case "storage.createBucket": {
        const name = String(args.name ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "버킷 이름이 필요합니다." };
        upsertExperienceResource(resource(projectId, "storage_bucket", name, { public: args.public === true }));
        appendExperienceLog(projectId, `Storage bucket ${name} created`);
        return { ok: true, op, data: { name } };
      }
      case "auth.listRoles": {
        const overlay = resourcesOfType(projectId, "auth_role").map((r) => r.name);
        const fromPerms = ctx.draft.permissions.filter((p) => p.enabled).map((p) => p.id);
        return { ok: true, op, data: { roles: [...new Set(["member", ...fromPerms, ...overlay])] } };
      }
      case "auth.createRole": {
        const name = String(args.name ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "Role 이름이 필요합니다." };
        upsertExperienceResource(resource(projectId, "auth_role", name));
        appendExperienceLog(projectId, `Role ${name} created`);
        return { ok: true, op, data: { name } };
      }
      case "user.list":
        return {
          ok: true,
          op,
          data: {
            users: resourcesOfType(projectId, "app_user").map((r) => ({
              name: r.name,
              email: String(r.meta?.email ?? `${r.name}@example.com`),
              role: String(r.meta?.role ?? "member"),
              status: r.status,
            })),
          },
        };
      case "user.create": {
        const name = String(args.name ?? args.email ?? "").trim() || "operator";
        upsertExperienceResource(
          resource(projectId, "app_user", name, {
            email: args.email ?? `${name}@example.com`,
            role: args.role ?? "member",
          }),
        );
        appendExperienceLog(projectId, `User ${name} created`);
        return { ok: true, op, data: { name } };
      }
      case "function.list":
        return {
          ok: true,
          op,
          data: { functions: ctx.draft.actions.map((a) => a.name) },
        };
      case "function.create": {
        const name = String(args.name ?? args.capability ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "Function 이름이 필요합니다." };
        if (!ctx.draft.actions.some((a) => a.name === name)) {
          ctx.updateDraft?.({
            actions: [
              ...ctx.draft.actions,
              {
                id: `fn-${name.replace(/\./g, "-")}`,
                name,
                description: String(args.description ?? name),
                inputSchema: '{"type":"object"}',
                outputSchema: `${name}.response.v1`,
                approvalRequired: /payment|commit|confirm/.test(name),
              },
            ],
          });
        }
        upsertExperienceResource(resource(projectId, "function", name));
        appendExperienceLog(projectId, `Function ${name} created`);
        return { ok: true, op, data: { name } };
      }
      case "job.list":
        return { ok: true, op, data: { jobs: resourcesOfType(projectId, "job") } };
      case "job.create": {
        const name = String(args.name ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "Automation 이름이 필요합니다." };
        upsertExperienceResource(
          resource(projectId, "job", name, { schedule: args.schedule ?? "manual" }),
        );
        return { ok: true, op, data: { name } };
      }
      case "secret.list":
        return {
          ok: true,
          op,
          data: {
            secrets: resourcesOfType(projectId, "secret").map((r) => ({
              name: r.name,
              set: true,
            })),
          },
        };
      case "secret.set": {
        const name = String(args.name ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "Secret 이름이 필요합니다." };
        upsertExperienceResource(resource(projectId, "secret", name, { set: true }));
        appendExperienceLog(projectId, `Secret ${name} stored (value hidden)`);
        return { ok: true, op, data: { name, stored: true } };
      }
      case "runtime.status":
        return {
          ok: true,
          op,
          data: {
            status: "ready",
            framework: "Next.js",
            tier: ctx.draft.runtimeTier,
          },
        };
      case "runtime.start":
      case "runtime.stop": {
        const status = op === "runtime.start" ? "running" : "stopped";
        upsertExperienceResource({ ...resource(projectId, "runtime", "workspace"), status });
        appendExperienceLog(projectId, `Runtime ${status}`);
        return { ok: true, op, data: { status, adapter: "local" } };
      }
      case "environment.list":
        return {
          ok: true,
          op,
          data: { environments: ["Development", "Preview", "Production"] },
        };
      case "domain.list": {
        const overlay = resourcesOfType(projectId, "domain").map((r) => r.name);
        const slug = ctx.draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "experience";
        return {
          ok: true,
          op,
          data: { domains: overlay.length ? overlay : [`${slug}.rimvio.app`] },
        };
      }
      case "domain.connect": {
        const name = String(args.name ?? args.domain ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "도메인이 필요합니다." };
        upsertExperienceResource(resource(projectId, "domain", name, { connected: true }));
        appendExperienceLog(projectId, `Domain ${name} connected`);
        return { ok: true, op, data: { name } };
      }
      case "log.list":
        return {
          ok: true,
          op,
          data: {
            logs: resourcesOfType(projectId, "log_event").map((r) => ({
              at: r.createdAt,
              message: r.name,
            })),
          },
        };
      case "log.append": {
        const message = String(args.message ?? "").trim();
        if (!message) return { ok: false, op, errorKo: "로그 메시지가 필요합니다." };
        appendExperienceLog(projectId, message);
        return { ok: true, op, data: { message } };
      }
      case "verification.run": {
        const report = await runExperienceVerification({ draft: ctx.draft });
        appendExperienceLog(
          projectId,
          report.ok ? "Verification passed" : "Verification failed",
        );
        return { ok: true, op, data: report };
      }
      case "capability.compose": {
        const capabilityId = String(args.capabilityId ?? args.name ?? "").trim();
        if (!capabilityId) return { ok: false, op, errorKo: "Capability가 필요합니다." };
        const applied: string[] = [];
        for (const step of infrastructureForCapability(capabilityId)) {
          const result = await invokeExperienceResource(step.op, step.args, ctx);
          if (!result.ok) {
            return { ok: false, op, data: { applied }, errorKo: result.errorKo };
          }
          applied.push(step.op);
        }
        appendExperienceLog(projectId, `Capability ${capabilityId} composed`);
        return { ok: true, op, data: { applied, capabilityId } };
      }
      case "experience.build": {
        let draft = ctx.draft;
        if (draft.actions.length === 0) {
          draft = applyExperienceBlueprintToDraft(
            experienceBlueprintFromUtterance(String(args.utterance ?? draft.description ?? draft.name)),
            draft,
          );
          ctx.updateDraft?.(draft);
        }
        const buildCtx = { ...ctx, draft };
        const tables = parseCollections(draft);
        for (const table of tables) {
          await invokeExperienceResource("database.createTable", { name: table.name }, buildCtx);
        }
        for (const action of draft.actions) {
          await invokeExperienceResource("function.create", { name: action.name }, buildCtx);
        }
        upsertExperienceResource({ ...resource(projectId, "runtime", "workspace"), status: "running" });
        const report = await runExperienceVerification({ draft });
        appendExperienceLog(projectId, "Experience build sequence finished");
        return {
          ok: report.ok,
          op,
          data: {
            tables: tables.map((t) => t.name),
            functions: draft.actions.map((a) => a.name),
            verification: report,
            resources: listExperienceResources(projectId).length,
          },
        };
      }
      case "capability.invoke": {
        const capabilityId = String(args.capabilityId ?? args.name ?? "");
        const input =
          args.input && typeof args.input === "object"
            ? (args.input as Record<string, unknown>)
            : {};
        const invoked = await invokePlatformCapability({
          draft: ctx.draft,
          capabilityId,
          input,
        });
        return { ok: invoked.ok, op, data: invoked, errorKo: invoked.errorKo };
      }
      case "deployment.status":
        return {
          ok: true,
          op,
          data: {
            published: snapshot.status.published,
            agentReady: snapshot.status.agentReady,
            preview: resourcesOfType(projectId, "deployment").map((r) => r.name),
          },
        };
      case "deployment.create": {
        upsertExperienceResource({
          ...resource(projectId, "deployment", `preview-${Date.now()}`),
          status: "deploying",
        });
        appendExperienceLog(projectId, "Preview deployment created — production needs approval");
        return {
          ok: true,
          op,
          data: { environment: "preview", requiresApproval: true },
        };
      }
      case "deployment.rollback":
        appendExperienceLog(projectId, "Rollback requested — awaiting user approval");
        return {
          ok: true,
          op,
          data: { status: "pending_approval", requiresApproval: true },
        };
      default:
        return { ok: false, op, errorKo: `unknown resource op: ${op}` };
    }
  } catch (err) {
    return {
      ok: false,
      op,
      errorKo: err instanceof Error ? err.message : "resource failed",
    };
  }
}

export function parseResourceOpFromUtterance(utterance: string): {
  readonly op: ExperienceResourceOp;
  readonly args: Record<string, unknown>;
} | null {
  const t = utterance.trim();
  if (/테이블|table/i.test(t) && /만들|생성|create/i.test(t)) {
    const name = t.match(/([a-z_][a-z0-9_]*)/i)?.[1] ?? "records";
    return { op: "database.createTable", args: { name } };
  }
  if (/storage|버킷|이미지/i.test(t) && /만들|생성|create/i.test(t)) {
    return { op: "storage.createBucket", args: { name: "uploads" } };
  }
  if (/role|역할|판매자|구매자/i.test(t) && /만들|추가/i.test(t)) {
    const name = /판매자|seller/i.test(t) ? "seller" : /구매자|buyer/i.test(t) ? "buyer" : "member";
    return { op: "auth.createRole", args: { name } };
  }
  if (/사용자|유저|user/i.test(t) && /만들|추가|초대/i.test(t)) {
    return { op: "user.create", args: { name: "operator", role: "admin" } };
  }
  if (/도메인|domain/i.test(t) && /연결|connect|추가/i.test(t)) {
    return { op: "domain.connect", args: { name: "www.example.com" } };
  }
  if (/롤백|rollback|되돌려/i.test(t)) {
    return { op: "deployment.rollback", args: {} };
  }
  if (/배포|deploy/i.test(t)) {
    return { op: "deployment.create", args: {} };
  }
  if (/서버|runtime|재시작/i.test(t)) {
    return { op: /멈춰|stop|꺼/i.test(t) ? "runtime.stop" : "runtime.start", args: {} };
  }
  if (/검증|verify|테스트해/i.test(t)) {
    return { op: "verification.run", args: {} };
  }
  if (/검색|결제|메뉴|판매자|호텔/i.test(t) && /추가|만들|연결/i.test(t)) {
    const capabilityId = /결제|payment/i.test(t)
      ? "payment.prepare"
      : /호텔|검색/i.test(t)
        ? "hotel.search"
        : /메뉴/i.test(t)
          ? "menu.create"
          : "listing.create";
    return { op: "capability.compose", args: { capabilityId } };
  }
  return null;
}
