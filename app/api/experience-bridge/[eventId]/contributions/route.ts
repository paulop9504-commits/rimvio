import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { canReadBridgeExperience } from "@/lib/experience-bridge";
import type { BridgeContributionCapture } from "@/lib/experience-bridge/bridge-capture-spacetime";
import { deleteBridgeCaptureMediaFromStorage } from "@/lib/experience-bridge/bridge-media-server";
import { normalizeBridgeContributionCapture } from "@/lib/experience-bridge/normalize-bridge-contribution-capture";
import { serverSaveBridgeContribution } from "@/lib/experience-bridge/server-save-bridge-contribution";
import {
  deleteBridgeContribution,
  listBridgeContributions,
} from "@/lib/experience-bridge/server-bridge-contributions";
import { upsertBridgeSyncCursor } from "@/lib/experience-bridge/server-bridge-sync-cursors";
import { fetchExperienceBridgeState } from "@/lib/experience-bridge/server-bridge-store";
import { toBridgeContributionWire } from "@/lib/experience-bridge/wire-bridge-response-dto";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { resolveServiceRoleOrUserClient } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

function isPhotoOrVideoCapture(value: unknown): value is BridgeContributionCapture {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<BridgeContributionCapture>;
  return (
    typeof row.id === "string" &&
    (row.kind === "photo" || row.kind === "video") &&
    typeof row.capturedAtIso === "string"
  );
}

function maxContributionCreatedAt(
  contributions: { createdAtIso: string }[],
): string | null {
  let max: string | null = null;
  for (const row of contributions) {
    const iso = row.createdAtIso?.trim();
    if (!iso) {
      continue;
    }
    if (!max || Date.parse(iso) > Date.parse(max)) {
      max = iso;
    }
  }
  return max;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();
  const since = new URL(request.url).searchParams.get("since")?.trim() || null;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ contributions: [], serverTime: new Date().toISOString() });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const state = await fetchExperienceBridgeState(supabase, key);
    if (!state) {
      return NextResponse.json({ contributions: [], serverTime: new Date().toISOString() });
    }
    if (
      !canReadBridgeExperience({
        viewerUserId: userId,
        participants: state.participants,
        hostUserId: state.bridge.hostUserId,
      })
    ) {
      return NextResponse.json({ contributions: [], serverTime: new Date().toISOString() });
    }
    const contributions = await listBridgeContributions(db, key, { sinceIso: since });
    const serverTime = new Date().toISOString();

    try {
      await upsertBridgeSyncCursor(db, {
        bridgeEventId: key,
        userId,
        lastPulledAt: serverTime,
        lastContributionCreatedAt: maxContributionCreatedAt(contributions),
      });
    } catch {
      /* cursor table may not exist until migration 048 */
    }

    return NextResponse.json({
      contributions: contributions.map(toBridgeContributionWire),
      serverTime,
      delta: Boolean(since),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load bridge contributions.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ContributionPostBody = {
  capture?: BridgeContributionCapture;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();
  const body = (await request.json()) as ContributionPostBody;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!isPhotoOrVideoCapture(body.capture)) {
    return NextResponse.json({ error: "Photo or video capture required." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const state = await fetchExperienceBridgeState(supabase, key);
    if (!state) {
      return NextResponse.json({ error: "Bridge not found." }, { status: 404 });
    }
    if (
      !canReadBridgeExperience({
        viewerUserId: userId,
        participants: state.participants,
        hostUserId: state.bridge.hostUserId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const capture = normalizeBridgeContributionCapture({
      ...body.capture,
      ownerUserId: userId,
    });

    await serverSaveBridgeContribution({
      userClient: supabase,
      bridgeEventId: key,
      contributorUserId: userId,
      capture,
    });

    return NextResponse.json({ ok: true, capture });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to save bridge contribution.");
    const lowered = message.toLowerCase();
    if (
      lowered.includes("row-level security") ||
      lowered.includes("policy") ||
      lowered.includes("permission denied")
    ) {
      return NextResponse.json(
        { error: "브릿지에 참여한 뒤에 사진·동영상을 공유할 수 있어요." },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ContributionDeleteBody = {
  captureId?: string;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();
  const body = (await request.json()) as ContributionDeleteBody;
  const captureId = body.captureId?.trim();

  if (!captureId) {
    return NextResponse.json({ error: "captureId required." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const state = await fetchExperienceBridgeState(supabase, key);
    if (!state) {
      return NextResponse.json({ error: "Bridge not found." }, { status: 404 });
    }
    if (
      !canReadBridgeExperience({
        viewerUserId: userId,
        participants: state.participants,
        hostUserId: state.bridge.hostUserId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { mediaUrl } = await deleteBridgeContribution(supabase, {
      bridgeEventId: key,
      contributorUserId: userId,
      captureId,
    });

    try {
      await deleteBridgeCaptureMediaFromStorage(supabase, { mediaUrl });
    } catch {
      // Row removed — stale storage is acceptable.
    }

    return NextResponse.json({ ok: true, captureId });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to delete bridge contribution.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
