/**
 * UI + Agent shared op runner — Resource API + Action Metadata.
 */

import type { ExperienceActor } from "@/lib/experience-app/types";
import type { ExperienceSurfaceId } from "@/lib/experience-app/surface-types";
import { recordActionMetadata } from "@/lib/experience-app/action-metadata-store";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  invokeExperienceResource,
  type ExperienceResourceContext,
} from "@/lib/hub/dev/experience-os/resource-api";
import type { ExperienceResourceOp, ExperienceResourceResult } from "@/lib/hub/dev/experience-os/types";

export async function runExperienceOp(
  op: ExperienceResourceOp,
  args: Record<string, unknown>,
  ctx: ExperienceResourceContext & { readonly surface?: ExperienceSurfaceId },
): Promise<ExperienceResourceResult> {
  const actor: ExperienceActor = ctx.actor ?? { userId: "user_102", role: "consumer" };
  const result = await invokeExperienceResource(op, args, ctx);
  recordActionMetadata({
    op,
    actorId: actor.userId,
    actorRole: actor.role,
    surface: ctx.surface,
    entityType: result.ok && (result.data as { order?: { id: string } })?.order ? "order" : undefined,
    entityId: result.ok ? (result.data as { order?: { id: string } })?.order?.id : undefined,
    input: args,
    output: result.ok ? (result.data as Record<string, unknown>) : { errorKo: result.errorKo },
    status: result.ok ? "success" : "error",
  });
  return result;
}
