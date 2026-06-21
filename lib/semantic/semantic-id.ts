import { normalizeMeaningPerson } from "@/lib/meaning/meaning-node-id";

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function semanticExperienceId(eventId: string): string {
  return `ec:${eventId.trim()}`;
}

export function semanticHubId(serviceId: string): string {
  return `hub:${serviceId.trim()}`;
}

export function semanticActionId(featureId: string): string {
  return `action:${featureId.trim()}`;
}

export function semanticPersonId(displayName: string): string {
  return `person:${slug(normalizeMeaningPerson(displayName))}`;
}

export function semanticPlaceId(placeLabel: string): string {
  return `place:${slug(placeLabel.trim())}`;
}

export function semanticContextId(eventId: string): string {
  return `ctx:${eventId.trim()}`;
}
