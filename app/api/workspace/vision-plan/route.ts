import { NextResponse, type NextRequest } from "next/server";
import { MAX_CAPTURE_IMAGE_BYTES } from "@/lib/capture/process-capture-image";
import {
  planWorkspaceFromImage,
  type WorkspaceVisionPlan,
} from "@/lib/context-run/workspace-vision-plan";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 60;
export const runtime = "nodejs";

export type WorkspaceVisionPlanResponse = {
  readonly ok: boolean;
  readonly plan: WorkspaceVisionPlan | null;
  readonly error?: string;
};

export async function POST(request: NextRequest) {
  const requestId = readRequestId(request);
  const started = Date.now();
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const userTextRaw = formData.get("userText");
    const userText =
      typeof userTextRaw === "string" ? userTextRaw.trim() : "";

    if (!(image instanceof File)) {
      return NextResponse.json(
        { ok: false, plan: null, error: "image_required" } satisfies WorkspaceVisionPlanResponse,
        { status: 400 },
      );
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, plan: null, error: "invalid_image_type" } satisfies WorkspaceVisionPlanResponse,
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    if (buffer.byteLength > MAX_CAPTURE_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, plan: null, error: "image_too_large" } satisfies WorkspaceVisionPlanResponse,
        { status: 413 },
      );
    }

    const plan = await planWorkspaceFromImage({
      buffer,
      mimeType: image.type || "image/jpeg",
      userText: userText || null,
    });

    logApi("info", "workspace.vision_plan", {
      route: "/api/workspace/vision-plan",
      method: "POST",
      requestId,
      durationMs: Date.now() - started,
      status: plan ? 200 : 422,
      detail: plan
        ? `domain=${plan.domain ?? "null"};work=${plan.work}`
        : "vision_plan_empty",
    });

    return NextResponse.json({
      ok: Boolean(plan),
      plan,
      error: plan ? undefined : "vision_plan_empty",
    } satisfies WorkspaceVisionPlanResponse);
  } catch (error) {
    logApi("error", "workspace.vision_plan.fail", {
      route: "/api/workspace/vision-plan",
      method: "POST",
      requestId,
      durationMs: Date.now() - started,
      status: 500,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        ok: false,
        plan: null,
        error: "vision_plan_failed",
      } satisfies WorkspaceVisionPlanResponse,
      { status: 500 },
    );
  }
}
