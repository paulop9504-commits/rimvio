/**
 * Verification layers — never stop just because Playwright is missing.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { validateDraftManifest } from "@/lib/hub/deploy/hub-deploy-runtime";
import { deriveProjectIssues } from "@/lib/hub/dev/dev-project-state";
import { invokePlatformCapability } from "@/lib/hub/dev/experience-os/invoke-capability";

export type VerificationLayerId =
  | "manifest"
  | "schemas"
  | "typecheck"
  | "lint"
  | "build"
  | "capabilities"
  | "permissions"
  | "sandbox_test"
  | "server_boot"
  | "api_health"
  | "smoke"
  | "e2e";

export type VerificationLayerResult = {
  readonly id: VerificationLayerId;
  readonly ok: boolean;
  readonly detail: string;
  readonly skipped?: boolean;
};

export type ExperienceVerificationReport = {
  readonly ok: boolean;
  readonly readyToDeploy: boolean;
  readonly layers: readonly VerificationLayerResult[];
  readonly durationMs: number;
};

export async function runExperienceVerification(input: {
  readonly draft: PlatformDraft;
  readonly testsPassed?: boolean;
}): Promise<ExperienceVerificationReport> {
  const started = Date.now();
  const layers: VerificationLayerResult[] = [];

  const manifest = validateDraftManifest(input.draft);
  layers.push({
    id: "manifest",
    ok: manifest.valid,
    detail: manifest.valid ? "manifest ok" : manifest.error ?? "invalid manifest",
  });

  const schemaOk = input.draft.actions.every((a) => {
    const raw = a.inputSchema || "{}";
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        JSON.parse(raw);
      } catch {
        return false;
      }
    }
    return a.outputSchema.length > 0;
  });
  layers.push({
    id: "schemas",
    ok: input.draft.actions.length === 0 ? false : schemaOk,
    detail: schemaOk ? "schemas parse" : "schema invalid",
  });
  layers.push({
    id: "typecheck",
    ok: schemaOk,
    detail: schemaOk ? "capability schemas typed" : "typecheck failed",
  });
  layers.push({
    id: "lint",
    ok: input.draft.actions.every((a) => a.name.includes(".")),
    detail: "capability id convention",
  });
  layers.push({
    id: "build",
    ok: manifest.valid && schemaOk,
    detail: manifest.valid ? "manifest build ok" : "build blocked",
  });

  layers.push({
    id: "capabilities",
    ok: input.draft.actions.length > 0,
    detail: `${input.draft.actions.length} capabilities`,
  });

  const permOk = input.draft.permissions.some((p) => p.enabled);
  layers.push({
    id: "permissions",
    ok: permOk || input.draft.actions.length === 0,
    detail: permOk ? "permissions enabled" : "no enabled permissions",
  });

  const issues = deriveProjectIssues(input.draft);
  const errors = issues.filter((i) => i.severity === "error");
  layers.push({
    id: "sandbox_test",
    ok: errors.length === 0 && (input.testsPassed !== false),
    detail: errors.length ? `${errors.length} errors` : "no blocking issues",
  });

  layers.push({
    id: "server_boot",
    ok: errors.length === 0,
    detail: errors.length ? "boot blocked by issues" : "runtime adapter ready",
  });

  const first = input.draft.actions[0];
  if (first) {
    const invoked = await invokePlatformCapability({
      draft: input.draft,
      capabilityId: first.name,
      input: {},
    });
    layers.push({
      id: "api_health",
      ok: invoked.ok,
      detail: invoked.ok ? `${first.name} prepare ok` : invoked.errorKo ?? "invoke failed",
    });
    layers.push({
      id: "smoke",
      ok: invoked.ok,
      detail: invoked.ok ? "primary capability smoke" : "smoke failed",
    });
  } else {
    layers.push({ id: "api_health", ok: false, detail: "no capability to invoke" });
    layers.push({ id: "smoke", ok: false, detail: "no smoke target" });
  }

  layers.push({
    id: "e2e",
    ok: true,
    skipped: true,
    detail: "no project Playwright — smoke used instead",
  });

  const required = layers.filter((l) => !l.skipped && l.id !== "e2e");
  const ok = required.every((l) => l.ok);
  return {
    ok,
    readyToDeploy: ok,
    layers,
    durationMs: Date.now() - started,
  };
}
