import { copy } from "@/lib/copy/human-ko";
import {
  buildPassiveLocationCareBody,
  buildPassiveLocationCareTitle,
} from "@/lib/globe/passive-context/build-passive-location-care-copy";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";
import {
  bridgeInviteNotificationId,
  locationConfirmNotificationId,
} from "@/lib/ontology/notifications/notification-id";
import type {
  ProjectPendingNotificationsInput,
  RimvioNotification,
} from "@/lib/ontology/notifications/types";

/** Single inbox queue — bridge invite · activity · location confirm. */
export function projectPendingNotifications(
  input: ProjectPendingNotificationsInput,
): RimvioNotification[] {
  const dismissed = input.dismissedIds ?? new Set<string>();
  const out: RimvioNotification[] = [];

  for (const invite of input.invites) {
    const eventId = invite.state.bridge.eventId.trim();
    const id = bridgeInviteNotificationId(eventId);
    if (dismissed.has(id)) {
      continue;
    }
    const host = invite.state.participants.find((row) => row.role === "host");
    const hostName =
      host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
    out.push({
      id,
      kind: "bridge_invite",
      status: "pending",
      priority: 100,
      section: "share",
      title: copy.globe.bridgeInviteTitle(hostName, invite.state.bridge.title),
      body: copy.globe.bridgeInviteBody,
      primaryCtaLabel: copy.globe.bridgeInviteAcceptCta,
      dismissCtaLabel: copy.globe.bridgeInviteDeclineCta,
      targetKind: "bridge",
      targetId: eventId,
      bridgeInvite: invite,
    });
  }

  for (const activity of input.bridgeActivities) {
    if (dismissed.has(activity.id)) {
      continue;
    }
    out.push({
      id: activity.id,
      kind: "bridge_activity",
      status: "pending",
      priority: activity.priority,
      section: "bridge_activity",
      title: activity.title,
      body: activity.line,
      primaryCtaLabel: activity.ctaLabel,
      primaryCtaHref: activity.href,
      dismissCtaLabel: copy.globe.inboxLocationDismiss,
      targetKind: "experience",
      targetId: activity.eventId,
      bridgeActivity: activity,
    });
  }

  for (const row of input.locationConfirms) {
    const id = locationConfirmNotificationId(row.eventId);
    if (dismissed.has(id)) {
      continue;
    }
    const dwellLabel =
      row.dwellMinutes != null ? formatDwellMinutesLabel(row.dwellMinutes) : null;
    out.push({
      id,
      kind: "location_confirm",
      status: "pending",
      priority: row.kind === "gps_dwell" ? 65 : 60,
      section: "location",
      title:
        row.kind === "photo_place"
          ? copy.globe.inboxPhotoPlaceTitle(row.place)
          : buildPassiveLocationCareTitle({
              place: row.place,
              datetimeIso: row.datetime,
            }),
      body:
        row.kind === "gps_dwell"
          ? buildPassiveLocationCareBody({ dwellLabel })
          : row.title,
      primaryCtaLabel:
        row.kind === "gps_dwell"
          ? copy.globe.passiveLocationCareConfirm
          : copy.globe.inboxLocationConfirm,
      dismissCtaLabel: copy.globe.inboxLocationDismiss,
      targetKind: "experience",
      targetId: row.eventId,
      locationConfirm: row,
    });
  }

  return out.sort((left, right) => right.priority - left.priority);
}

export function groupNotificationsBySection(
  notifications: readonly RimvioNotification[],
): Record<RimvioNotification["section"], RimvioNotification[]> {
  return {
    share: notifications.filter((row) => row.section === "share"),
    bridge_activity: notifications.filter((row) => row.section === "bridge_activity"),
    location: notifications.filter((row) => row.section === "location"),
  };
}
