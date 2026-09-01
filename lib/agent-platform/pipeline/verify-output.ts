/**
 * Mandatory capability output verification — schema + domain facts.
 */

import { verifySandboxOutput } from "@/lib/sandbox/verify";

export type VerifyOutputResult = {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly emptyResult?: boolean;
};

export function verifyCapabilityOutput(input: {
  readonly capabilityId: string;
  readonly output: Record<string, unknown> | null;
}): VerifyOutputResult {
  const { capabilityId, output } = input;
  if (!output) {
    return { ok: false, errors: ["output_null"], emptyResult: true };
  }

  if (
    capabilityId === "hotel.search" ||
    capabilityId === "hotel.detail" ||
    capabilityId === "product.search"
  ) {
    const sandbox = verifySandboxOutput(capabilityId, output);
    const emptyResult =
      capabilityId === "hotel.search" &&
      typeof output.hotelsFound === "number" &&
      output.hotelsFound === 0;
    const productsEmpty =
      capabilityId === "product.search" &&
      Array.isArray(output.products) &&
      output.products.length === 0;
    return {
      ok: sandbox.ok && !emptyResult && !productsEmpty,
      errors: [
        ...sandbox.errors,
        ...(emptyResult ? ["hotelsFound_is_zero"] : []),
        ...(productsEmpty ? ["products_empty"] : []),
      ],
      emptyResult: emptyResult || productsEmpty,
    };
  }

  if (capabilityId.startsWith("workspace.")) {
    if (
      !output.workspaceId &&
      output.nodeCount === undefined &&
      output.patchApplied == null &&
      output.remembered !== true &&
      output.prepare !== true
    ) {
      return { ok: false, errors: ["workspace_patch_no_effect"] };
    }
    return { ok: true, errors: [] };
  }

  if (capabilityId.startsWith("graph.")) {
    if (!output.fromId && !output.patchApplied && !output.bound) {
      return { ok: false, errors: ["graph_mutation_missing"] };
    }
    return { ok: true, errors: [] };
  }

  if (capabilityId.startsWith("api.http")) {
    const status = output.status;
    if (typeof status === "number" && status >= 400) {
      return { ok: false, errors: [`http_${status}`] };
    }
    return { ok: true, errors: [] };
  }

  if (output.prepare === true && !output.queued) {
    return { ok: true, errors: [] };
  }

  if (output.queued === true) {
    return { ok: true, errors: [] };
  }

  return { ok: true, errors: [] };
}
