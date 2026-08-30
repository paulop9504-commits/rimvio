/**
 * Shared Resource API — UI and Operator Agent call the same ops.
 * Adapters: draft JSON + session overlay now; real infra later.
 */

import type { ExperienceActor } from "@/lib/experience-app/types";
import {
  advanceExperienceOrder,
  canAdvanceOrder,
  canCancelOrder,
  canViewOrder,
  createExperienceOrder,
  denyReasonKo,
  getExperienceOrder,
  listExperienceOrders,
  listOrderMetadata,
  parseExperienceAppUtterance,
  readExperienceActor,
  storesForQuery,
  updateExperienceOrderStatus,
} from "@/lib/experience-app";
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
import {
  defaultColumnsForTable,
  listStorageObjects,
  readAuthProviders,
  readTableColumns,
  resolveRuntimeAdapter,
  writeAuthProvider,
  writeStorageObjects,
  writeTableColumns,
} from "@/lib/hub/dev/experience-os/adapters";
import type { AuthProviderId, TableColumn } from "@/lib/hub/dev/experience-os/adapters";
import {
  EXPERIENCE_BUILD_STEPS,
  type ExperienceBuildStep,
} from "@/lib/hub/dev/experience-os/build-steps";

export type ExperienceResourceContext = {
  readonly draft: PlatformDraft;
  readonly updateDraft?: (patch: Partial<PlatformDraft>) => void;
  readonly actor?: ExperienceActor;
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

function actorOf(ctx: ExperienceResourceContext): ExperienceActor {
  return ctx.actor ?? readExperienceActor();
}

function visibleOrders(ctx: ExperienceResourceContext) {
  const actor = actorOf(ctx);
  return listExperienceOrders().filter((order) => canViewOrder(actor, order));
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
        const columns = defaultColumnsForTable(name);
        upsertExperienceResource(resource(projectId, "database_table", name, { columns }));
        appendExperienceLog(projectId, `Database table ${name} created`);
        return { ok: true, op, data: { name, columns } };
      }
      case "database.updateSchema": {
        const name = String(args.name ?? args.table ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "테이블 이름이 필요합니다." };
        const columns = Array.isArray(args.columns)
          ? (args.columns as TableColumn[])
          : readTableColumns(projectId, name);
        writeTableColumns(projectId, name, columns);
        appendExperienceLog(projectId, `Schema updated · ${name}`);
        return { ok: true, op, data: { name, columns } };
      }
      case "storage.listBuckets": {
        const overlay = resourcesOfType(projectId, "storage_bucket").map((r) => r.name);
        const defaults = overlay.length ? overlay : ["uploads", "avatars"];
        return { ok: true, op, data: { buckets: defaults } };
      }
      case "storage.createBucket": {
        const name = String(args.name ?? "").trim();
        if (!name) return { ok: false, op, errorKo: "버킷 이름이 필요합니다." };
        upsertExperienceResource(
          resource(projectId, "storage_bucket", name, { public: args.public === true, objects: [] }),
        );
        appendExperienceLog(projectId, `Storage bucket ${name} created`);
        return { ok: true, op, data: { name } };
      }
      case "storage.listObjects": {
        const bucket = String(args.bucket ?? args.name ?? "uploads");
        return { ok: true, op, data: { bucket, objects: listStorageObjects(projectId, bucket) } };
      }
      case "storage.upload": {
        const bucket = String(args.bucket ?? "uploads");
        const fileName = String(args.name ?? args.fileName ?? "").trim();
        if (!fileName) return { ok: false, op, errorKo: "파일 이름이 필요합니다." };
        const objects = [
          ...listStorageObjects(projectId, bucket),
          { name: fileName, size: Number(args.size ?? 0), public: args.public === true },
        ];
        writeStorageObjects(projectId, bucket, objects, { public: args.public === true });
        appendExperienceLog(projectId, `Uploaded ${fileName} → ${bucket}`);
        return { ok: true, op, data: { bucket, name: fileName } };
      }
      case "storage.delete": {
        const bucket = String(args.bucket ?? "uploads");
        const fileName = String(args.name ?? args.fileName ?? "").trim();
        if (!fileName) return { ok: false, op, errorKo: "파일 이름이 필요합니다." };
        const objects = listStorageObjects(projectId, bucket).filter((o) => o.name !== fileName);
        writeStorageObjects(projectId, bucket, objects);
        appendExperienceLog(projectId, `Deleted ${fileName} from ${bucket}`);
        return { ok: true, op, data: { bucket, name: fileName } };
      }
      case "auth.listRoles": {
        const overlay = resourcesOfType(projectId, "auth_role")
          .map((r) => r.name)
          .filter((name) => name !== "__providers");
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
      case "auth.listProviders":
        return { ok: true, op, data: { providers: readAuthProviders(projectId) } };
      case "auth.updateProvider": {
        const id = String(args.id ?? args.name ?? "").trim() as AuthProviderId;
        if (!id) return { ok: false, op, errorKo: "Provider가 필요합니다." };
        const providers = writeAuthProvider(projectId, id, args.enabled !== false);
        appendExperienceLog(projectId, `Auth provider ${id} ${args.enabled === false ? "off" : "on"}`);
        return { ok: true, op, data: { providers } };
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
      case "runtime.status": {
        const runtime = await resolveRuntimeAdapter("mock").status(projectId);
        return { ok: true, op, data: { ...runtime, tier: ctx.draft.runtimeTier } };
      }
      case "runtime.start":
      case "runtime.stop":
      case "runtime.restart": {
        const adapter = resolveRuntimeAdapter("mock");
        const runtime =
          op === "runtime.start"
            ? await adapter.start(projectId)
            : op === "runtime.stop"
              ? await adapter.stop(projectId)
              : await adapter.restart(projectId);
        appendExperienceLog(projectId, `Runtime ${runtime.status} (${runtime.adapter})`);
        return { ok: true, op, data: runtime };
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
        const steps: ExperienceBuildStep[] = EXPERIENCE_BUILD_STEPS.map((s) => ({
          ...s,
          status: "pending",
        }));
        const mark = (id: ExperienceBuildStep["id"], status: ExperienceBuildStep["status"], detail?: string) => {
          const idx = steps.findIndex((s) => s.id === id);
          if (idx >= 0) steps[idx] = { ...steps[idx]!, status, detail };
        };

        let draft = ctx.draft;
        mark("workspace", "running");
        if (draft.actions.length === 0) {
          draft = applyExperienceBlueprintToDraft(
            experienceBlueprintFromUtterance(String(args.utterance ?? draft.description ?? draft.name)),
            draft,
          );
          ctx.updateDraft?.(draft);
        }
        mark("workspace", "done");
        mark("repository", "done", draft.id);

        const buildCtx = { ...ctx, draft };
        mark("database", "running");
        const tables = parseCollections(draft);
        for (const table of tables) {
          await invokeExperienceResource("database.createTable", { name: table.name }, buildCtx);
        }
        mark("database", "done", `${tables.length} tables`);

        mark("storage", "running");
        await invokeExperienceResource("storage.createBucket", { name: "uploads" }, buildCtx);
        mark("storage", "done");

        mark("auth", "running");
        await invokeExperienceResource("auth.createRole", { name: "member" }, buildCtx);
        await invokeExperienceResource("auth.updateProvider", { id: "email", enabled: true }, buildCtx);
        mark("auth", "done");

        mark("functions", "running");
        for (const action of draft.actions) {
          await invokeExperienceResource("function.create", { name: action.name }, buildCtx);
        }
        mark("functions", "done", `${draft.actions.length} functions`);

        mark("ui", "done", `${draft.uiRoutesJson ? "routes ready" : "default pages"}`);

        mark("runtime", "running");
        await invokeExperienceResource("runtime.start", {}, buildCtx);
        mark("runtime", "done");

        mark("verification", "running");
        const report = await runExperienceVerification({ draft });
        mark("verification", report.ok ? "done" : "error", report.ok ? "passed" : "failed");
        mark("preview", report.ok ? "done" : "pending");

        appendExperienceLog(projectId, "Experience build sequence finished");
        return {
          ok: report.ok,
          op,
          data: {
            tables: tables.map((t) => t.name),
            functions: draft.actions.map((a) => a.name),
            verification: report,
            resources: listExperienceResources(projectId).length,
            steps,
            progress: Math.round(
              (steps.filter((s) => s.status === "done").length / steps.length) * 100,
            ),
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
      case "order.list": {
        const actor = actorOf(ctx);
        const orders = visibleOrders(ctx);
        return { ok: true, op, data: { role: actor.role, orders } };
      }
      case "order.searchStores": {
        const query = String(args.query ?? args.utterance ?? "");
        return { ok: true, op, data: { stores: storesForQuery(query) } };
      }
      case "order.create": {
        const actor = actorOf(ctx);
        if (actor.role !== "consumer") {
          return { ok: false, op, errorKo: "주문 생성은 소비자 맥락에서만 가능해요." };
        }
        const storeId = String(args.storeId ?? "store_42");
        const storeName = String(args.storeName ?? "BHC 역삼점");
        const lines = Array.isArray(args.lines)
          ? (args.lines as Array<{ name: string; qty: number; priceKrw: number }>)
          : [{ name: "뿌링클", qty: 1, priceKrw: 23000 }];
        const order = createExperienceOrder({
          storeId,
          storeName,
          consumerId: actor.userId,
          lines,
        });
        appendExperienceLog(projectId, `Order #${order.displayId} created`);
        return { ok: true, op, data: { order } };
      }
      case "order.status": {
        const actor = actorOf(ctx);
        const id = String(args.id ?? args.orderId ?? "");
        const order = id ? getExperienceOrder(id) : visibleOrders(ctx)[0] ?? null;
        if (!order) return { ok: false, op, errorKo: "주문을 찾지 못했어요." };
        if (!canViewOrder(actor, order)) {
          return { ok: false, op, errorKo: denyReasonKo("view") };
        }
        const metadata = actor.role === "consumer" ? [] : listOrderMetadata(order.id);
        return { ok: true, op, data: { order, metadata } };
      }
      case "order.cancel": {
        const actor = actorOf(ctx);
        const mine = args.mine === true || actor.role === "consumer";
        const pool = visibleOrders(ctx).filter((o) => (mine ? o.consumerId === actor.userId : true));
        const id = String(args.id ?? args.orderId ?? "");
        const order = id
          ? getExperienceOrder(id)
          : args.latest === true
            ? pool[0] ?? null
            : pool[0] ?? null;
        if (!order) return { ok: false, op, errorKo: "취소할 주문이 없어요." };
        if (!canCancelOrder(actor, order)) {
          return { ok: false, op, errorKo: denyReasonKo("cancel") };
        }
        const next = updateExperienceOrderStatus(order.id, "cancelled");
        appendExperienceLog(projectId, `Order #${order.displayId} cancelled`);
        return { ok: true, op, data: { order: next, requiresApproval: actor.role === "merchant" } };
      }
      case "order.advance": {
        const actor = actorOf(ctx);
        const id = String(args.id ?? args.orderId ?? "");
        const order = id ? getExperienceOrder(id) : visibleOrders(ctx)[0] ?? null;
        if (!order) return { ok: false, op, errorKo: "주문을 찾지 못했어요." };
        if (!canAdvanceOrder(actor, order)) {
          return { ok: false, op, errorKo: denyReasonKo("advance") };
        }
        const next = advanceExperienceOrder(order.id);
        appendExperienceLog(projectId, `Order #${order.displayId} → ${next?.status ?? "?"}`);
        return { ok: true, op, data: { order: next } };
      }
      case "order.stats": {
        const actor = actorOf(ctx);
        if (actor.role !== "merchant") {
          return { ok: false, op, errorKo: "매출·주문 현황은 점주 맥락에서만 볼 수 있어요." };
        }
        const orders = visibleOrders(ctx);
        const today = new Date().toISOString().slice(0, 10);
        const todays = orders.filter((o) => o.createdAt.startsWith(today));
        const active = todays.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
        const sales = todays
          .filter((o) => o.status !== "cancelled")
          .reduce((sum, o) => sum + o.totalKrw, 0);
        return {
          ok: true,
          op,
          data: {
            count: todays.length,
            salesKrw: sales,
            preparing: todays.filter((o) => o.status === "preparing").length,
            delivering: todays.filter((o) => o.status === "delivering").length,
            active: active.length,
            orders: todays,
          },
        };
      }
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
  const appIntent = parseExperienceAppUtterance(t);
  if (appIntent) return { op: appIntent.op, args: appIntent.args };
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
  if (/스키마|컬럼|column/i.test(t) && /바꾸|수정|update/i.test(t)) {
    return { op: "database.updateSchema", args: { name: t.match(/([a-z_][a-z0-9_]*)/i)?.[1] ?? "records" } };
  }
  if (/업로드|upload/i.test(t)) {
    return { op: "storage.upload", args: { bucket: "uploads", name: "sample.jpg" } };
  }
  if (/서버|runtime|재시작/i.test(t)) {
    if (/재시작|restart/i.test(t)) return { op: "runtime.restart", args: {} };
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
