/**
 * Runtime / infra adapters — UI and Agent stay on Resource API.
 * Swap mock → local / development / production without changing panes.
 */

import type { ResourceStatus } from "@/lib/hub/dev/experience-os/types";

export type ExperienceAdapterKind = "mock" | "local" | "development" | "production";

export type RuntimeAdapterStatus = {
  readonly status: ResourceStatus;
  readonly framework: string;
  readonly node: string;
  readonly port: number;
  readonly process: string;
  readonly adapter: ExperienceAdapterKind;
};

export type ExperienceRuntimeAdapter = {
  readonly kind: ExperienceAdapterKind;
  status(projectId: string): Promise<RuntimeAdapterStatus>;
  start(projectId: string): Promise<RuntimeAdapterStatus>;
  stop(projectId: string): Promise<RuntimeAdapterStatus>;
  restart(projectId: string): Promise<RuntimeAdapterStatus>;
};

export type AuthProviderId = "email" | "google" | "apple" | "kakao";

export type AuthProviderState = {
  readonly id: AuthProviderId;
  readonly enabled: boolean;
};

export type TableColumn = {
  readonly name: string;
  readonly type: "uuid" | "text" | "number" | "boolean" | "file" | "relation" | "timestamp";
  readonly required: boolean;
};

export type StorageObjectMeta = {
  readonly name: string;
  readonly size: number;
  readonly public: boolean;
};
