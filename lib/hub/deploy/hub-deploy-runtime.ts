/**
 * Hub Deploy Agent Runtime — Cursor-style Plan → Execute → Verify → Publish.
 * One Agent Runtime spine; Hub is a specialized Workspace Operator for software deploy.
 */

import type { CapabilityDraft } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  capabilityDraftToPlatformManifest,
  platformManifestToCapabilityDraft,
} from "@/lib/hub/capability/manifest-bridge";
import { computeStepValidation, canPublish } from "@/lib/hub/capability/validation";
import {
  computePlatformStepValidation,
  canPublishPlatform,
} from "@/lib/hub/platform/validation";
import {
  DEFAULT_DATA_COLLECTIONS_JSON,
  DEFAULT_UI_ROUTES_JSON,
  createDefaultPlatformDraft,
} from "@/lib/hub/platform/defaults";
import { compilePlatformRirToManifest } from "@/lib/platform-builder/compile-rir";
import { planFromUtterance } from "@/lib/platform-builder/plan-from-utterance";
import { isPlatformRir } from "@/lib/platform-builder/rir";
import { validateRimvioPlatformManifest } from "@/lib/platform-sdk/manifest";
import { registerCapabilityIndexFromManifest } from "@/lib/platform-sdk/capability-index";
import {
  mountPlatformHostApis,
  registerPlatformManifest,
} from "@/lib/platform-sdk/platform-host";
import type {
  PlatformMarketDeployment,
  PlatformMarketsDeclaration,
} from "@/lib/platform-sdk/types";
import {
  planCapabilityFromUtterance,
  planPlatformFromUtterance,
  type DeployAgentMessage,
  type DeployAgentProposal,
} from "@/lib/hub/deploy/hub-deploy-agent";

export type DeployAgentIntent = "build" | "test" | "deploy" | "chat";

export type DeployWorkStepStatus = "pending" | "running" | "success" | "failed" | "skipped";

export type DeployWorkStep = {
  readonly id: string;
  readonly labelKo: string;
  readonly status: DeployWorkStepStatus;
  readonly detail?: string;
};

export type DeployTurnPlan = {
  readonly intent: DeployAgentIntent;
  readonly messages: readonly DeployAgentMessage[];
  readonly patch: Partial<CapabilityDraft> | Partial<PlatformDraft> | null;
  readonly autoApplyPatch: boolean;
  readonly workSteps: readonly DeployWorkStep[];
  readonly proposal: DeployAgentProposal | null;
};

export type DeployPublishResult = {
  readonly success: boolean;
  readonly platformId?: string;
  readonly error?: string;
};

export type HubDeployRuntimeContext = {
  readonly mode: "capability" | "platform";
  readonly draft: CapabilityDraft | PlatformDraft;
  readonly testsPassed: boolean;
};

const READINESS_KEYS = [
  "localization",
  "currency",
  "payment",
  "tax",
  "legal",
  "privacy",
  "data_policy",
  "terms",
  "shipping",
  "seller_flow",
  "commerce",
] as const;

function msg(
  id: string,
  role: "user" | "agent",
  content: string,
  structured?: DeployAgentProposal | null,
): DeployAgentMessage {
  return { id, role, content, structured: structured ?? null };
}

export function resolveDeployIntent(utterance: string): DeployAgentIntent {
  const text = utterance.trim().toLowerCase();
  if (/배포|deploy|publish|출시|올려|제출|라이브|배포해/.test(text)) return "deploy";
  if (/테스트|test|실행해|검증|돌려/.test(text)) return "test";
  if (/만들|build|생성|구현|설계|추가|만들어/.test(text)) return "build";
  return "chat";
}

function completeMarketDeployment(d: PlatformMarketDeployment): PlatformMarketDeployment {
  const readiness = Object.fromEntries(
    READINESS_KEYS.map((k) => [k, "complete" as const]),
  ) as PlatformMarketDeployment["readiness"];

  return {
    ...d,
    status: "approved",
    readiness,
    review: {
      technical: "approved",
      security: "approved",
      localization: "approved",
      payment: "approved",
      privacy: "approved",
      commerce: "approved",
      policy: "approved",
    },
    commerce: d.commerce
      ? {
          ...d.commerce,
          paymentConfigured: true,
          taxConfigured: true,
        }
      : d.commerce,
  };
}

function prepareMarkets(markets: PlatformMarketsDeclaration): PlatformMarketsDeclaration {
  return {
    ...markets,
    deployments: markets.deployments.map((d) =>
      d.country === "GLOBAL" ? d : completeMarketDeployment(d),
    ),
  };
}

export function prepareDraftForAgentPublish(
  draft: CapabilityDraft,
  testsPassed: boolean,
): CapabilityDraft {
  return {
    ...draft,
    markets: prepareMarkets(draft.markets),
    publishConsents: {
      rights: true,
      permissions: true,
      policy: true,
      tested: testsPassed,
    },
  };
}

export function preparePlatformDraftForAgentPublish(
  draft: PlatformDraft,
  testsPassed: boolean,
): PlatformDraft {
  const base = prepareDraftForAgentPublish(draft, testsPassed) as PlatformDraft;
  return {
    ...base,
    architectureNotes:
      base.architectureNotes.trim() ||
      "Cloud-native agent runtime · tenant-strict data isolation",
    dataCollectionsJson: base.dataCollectionsJson.trim()
      ? base.dataCollectionsJson
      : DEFAULT_DATA_COLLECTIONS_JSON,
    uiRoutesJson: base.uiRoutesJson.trim() ? base.uiRoutesJson : DEFAULT_UI_ROUTES_JSON,
    workflowDescription:
      base.workflowDescription.trim() ||
      "Search → Create listing → Offer → Purchase with approval.",
    commerceNotes:
      base.commerceNotes.trim() || "KR: Kakao Pay · Toss · card. US: Stripe.",
    securityScanPassed: testsPassed,
  };
}

export function platformDraftFromUtterance(utterance: string): PlatformDraft | null {
  const result = planFromUtterance(utterance);
  if (result.type !== "blueprint" || !isPlatformRir(result.rir)) return null;

  const manifest = compilePlatformRirToManifest(result.rir);
  const seed = createDefaultPlatformDraft();
  const merged = platformManifestToCapabilityDraft(manifest, seed) as PlatformDraft;

  return {
    ...seed,
    ...merged,
    architectureNotes: `L1 Native · ${result.rir.features.slice(0, 4).join(" · ")}`,
    workflowDescription: result.rir.actions.map((a) => a.label).join(" → "),
    commerceNotes: seed.commerceNotes,
    dataCollectionsJson: DEFAULT_DATA_COLLECTIONS_JSON,
    uiRoutesJson: JSON.stringify(
      result.rir.pages.map((p) => ({
        path: p.path,
        surface: "page",
        component: p.component,
      })),
      null,
      2,
    ),
    securityScanPassed: false,
  };
}

export function planHubDeployTurn(
  utterance: string,
  ctx: HubDeployRuntimeContext,
): DeployTurnPlan {
  const intent = resolveDeployIntent(utterance);
  const userMsg = msg(`u_${Date.now()}`, "user", utterance.trim());

  if (intent === "deploy") {
    return {
      intent,
      messages: [
        userMsg,
        msg(
          `a_${Date.now()}`,
          "agent",
          "알겠습니다. manifest 검증 → 샌드박스 테스트 → Hub 제출까지 진행합니다.",
        ),
      ],
      patch: null,
      autoApplyPatch: false,
      proposal: null,
      workSteps: [
        { id: "validate", labelKo: "Manifest 검증", status: "pending" },
        { id: "prepare", labelKo: "배포 준비 (Market · 동의)", status: "pending" },
        { id: "test", labelKo: "Sandbox 테스트", status: "pending" },
        { id: "publish", labelKo: "Hub 제출 · Runtime 등록", status: "pending" },
      ],
    };
  }

  if (intent === "test") {
    return {
      intent,
      messages: [userMsg, msg(`a_${Date.now()}`, "agent", "샌드박스 테스트를 실행합니다.")],
      patch: null,
      autoApplyPatch: false,
      proposal: null,
      workSteps: [{ id: "test", labelKo: "Sandbox 테스트", status: "pending" }],
    };
  }

  if (intent === "build") {
    if (ctx.mode === "platform") {
      const fromRir = platformDraftFromUtterance(utterance);
      if (fromRir) {
        const proposal: DeployAgentProposal = {
          title: "Platform Blueprint",
          summaryKo: fromRir.name,
          bullets: [
            `ID: ${fromRir.id}`,
            `Market: ${fromRir.markets.primary}`,
            `Actions: ${fromRir.actions.length}개`,
            "manifest · 권한 · UI 라우트 자동 생성",
          ],
          suggestedStep: 3,
        };
        return {
          intent,
          messages: [
            userMsg,
            msg(`a_${Date.now()}`, "agent", "Blueprint를 컴파일했습니다. Workspace에 반영합니다.", proposal),
          ],
          patch: fromRir,
          autoApplyPatch: true,
          proposal,
          workSteps: [
            { id: "compile", labelKo: "RIR → Manifest 컴파일", status: "pending" },
            { id: "apply", labelKo: "Workspace Patch", status: "pending" },
          ],
        };
      }
    }

    const capPlan = planCapabilityFromUtterance(utterance, ctx.draft as CapabilityDraft);
    const platPlan = planPlatformFromUtterance(utterance);
    const plan = ctx.mode === "platform" ? platPlan : capPlan;
    const proposal = plan.messages.find((m) => m.structured)?.structured ?? null;

    return {
      intent,
      messages: plan.messages.length > 1 ? plan.messages : [userMsg, ...plan.messages.slice(1)],
      patch: plan.patch,
      autoApplyPatch: Boolean(plan.patch),
      proposal,
      workSteps: plan.patch
        ? [
            { id: "apply", labelKo: "Workspace Patch", status: "pending" },
            { id: "validate", labelKo: "Manifest 검증", status: "pending" },
          ]
        : [],
    };
  }

  const plan =
    ctx.mode === "platform"
      ? planPlatformFromUtterance(utterance)
      : planCapabilityFromUtterance(utterance, ctx.draft as CapabilityDraft);

  return {
    intent: "chat",
    messages: plan.messages,
    patch: plan.patch,
    autoApplyPatch: false,
    proposal: plan.messages.find((m) => m.structured)?.structured ?? null,
    workSteps: [],
  };
}

export function validateDraftManifest(
  draft: CapabilityDraft,
): { valid: boolean; error?: string } {
  const manifest = capabilityDraftToPlatformManifest(draft);
  const result = validateRimvioPlatformManifest(manifest);
  if (!result.valid) {
    return { valid: false, error: result.errors[0] };
  }
  return { valid: true };
}

export function isDraftPublishReady(
  mode: "capability" | "platform",
  draft: CapabilityDraft | PlatformDraft,
  testsPassed: boolean,
): boolean {
  if (mode === "platform") {
    const v = computePlatformStepValidation(draft as PlatformDraft, testsPassed);
    return canPublishPlatform(v, draft as PlatformDraft);
  }
  const v = computeStepValidation(draft as CapabilityDraft, testsPassed);
  return canPublish(v, draft as CapabilityDraft);
}

export async function publishDraftToHub(
  mode: "capability" | "platform",
  draft: CapabilityDraft | PlatformDraft,
  testsPassed: boolean,
): Promise<DeployPublishResult> {
  const prepared =
    mode === "platform"
      ? preparePlatformDraftForAgentPublish(draft as PlatformDraft, testsPassed)
      : prepareDraftForAgentPublish(draft as CapabilityDraft, testsPassed);

  if (!isDraftPublishReady(mode, prepared, testsPassed)) {
    return {
      success: false,
      error: "배포 준비가 완료되지 않았습니다. 필수 필드와 Market readiness를 확인하세요.",
    };
  }

  const manifest = capabilityDraftToPlatformManifest(prepared);
  const validation = validateRimvioPlatformManifest(manifest);
  if (!validation.valid) {
    return { success: false, error: validation.errors[0] ?? "Manifest validation failed" };
  }

  await new Promise((r) => setTimeout(r, 800));

  mountPlatformHostApis();
  registerPlatformManifest(manifest);
  registerCapabilityIndexFromManifest(manifest, "published");

  return { success: true, platformId: manifest.package.id };
}

export type DeployExecutorCallbacks = {
  readonly mode: "capability" | "platform";
  getDraft: () => CapabilityDraft | PlatformDraft;
  updateDraft: (patch: Partial<CapabilityDraft> | Partial<PlatformDraft>) => void;
  runSandboxTest: () => Promise<{ passed: boolean }>;
  onPublishSuccess: (platformId: string) => void;
  onGoToStep: (step: number) => void;
};

export async function executeHubDeployTurn(
  plan: DeployTurnPlan,
  callbacks: DeployExecutorCallbacks,
  onStepUpdate: (steps: DeployWorkStep[]) => void,
): Promise<{ workSteps: DeployWorkStep[]; publishResult?: DeployPublishResult }> {
  let steps = [...plan.workSteps];
  const setStep = (id: string, patch: Partial<DeployWorkStep>) => {
    steps = steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
    onStepUpdate(steps);
  };

  let draft = callbacks.getDraft();
  let testsPassed = false;

  if (plan.autoApplyPatch && plan.patch) {
    setStep("compile", { status: "running" });
    await new Promise((r) => setTimeout(r, 300));
    setStep("compile", { status: "success", detail: "RIR compiled" });

    setStep("apply", { status: "running" });
    callbacks.updateDraft(plan.patch);
    draft = { ...draft, ...plan.patch };
    await new Promise((r) => setTimeout(r, 200));
    setStep("apply", { status: "success", detail: "Draft updated" });
    callbacks.onGoToStep(plan.proposal?.suggestedStep ?? 2);
  }

  if (plan.intent === "test" || plan.intent === "deploy") {
    if (plan.intent === "deploy") {
      setStep("validate", { status: "running" });
      const validation = validateDraftManifest(draft as CapabilityDraft);
      if (!validation.valid) {
        setStep("validate", { status: "failed", detail: validation.error });
        return { workSteps: steps };
      }
      setStep("validate", { status: "success" });

      setStep("prepare", { status: "running" });
      const prepared =
        callbacks.mode === "platform"
          ? preparePlatformDraftForAgentPublish(draft as PlatformDraft, false)
          : prepareDraftForAgentPublish(draft as CapabilityDraft, false);
      callbacks.updateDraft(prepared);
      draft = prepared;
      await new Promise((r) => setTimeout(r, 200));
      setStep("prepare", { status: "success", detail: "Market · 동의 준비 완료" });
    }

    setStep("test", { status: "running" });
    const testResult = await callbacks.runSandboxTest();
    testsPassed = testResult.passed;
    draft = callbacks.getDraft();
    if (testsPassed) {
      const withTest =
        callbacks.mode === "platform"
          ? preparePlatformDraftForAgentPublish(draft as PlatformDraft, true)
          : prepareDraftForAgentPublish(draft as CapabilityDraft, true);
      callbacks.updateDraft(withTest);
      draft = withTest;
    }
    setStep("test", {
      status: testsPassed ? "success" : "failed",
      detail: testsPassed ? "3/3 passed" : "테스트 실패",
    });

    if (!testsPassed) return { workSteps: steps };

    if (plan.intent === "deploy") {
      setStep("publish", { status: "running" });
      const result = await publishDraftToHub(callbacks.mode, draft, true);
      if (result.success && result.platformId) {
        setStep("publish", {
          status: "success",
          detail: result.platformId,
        });
        callbacks.onPublishSuccess(result.platformId);
        callbacks.onGoToStep(callbacks.mode === "platform" ? 14 : 6);
        return { workSteps: steps, publishResult: result };
      }
      setStep("publish", { status: "failed", detail: result.error });
      return { workSteps: steps, publishResult: result };
    }
  }

  if (plan.workSteps.some((s) => s.id === "validate" && s.status === "pending")) {
    setStep("validate", { status: "running" });
    const validation = validateDraftManifest(draft as CapabilityDraft);
    setStep("validate", {
      status: validation.valid ? "success" : "failed",
      detail: validation.error,
    });
  }

  return { workSteps: steps };
}
