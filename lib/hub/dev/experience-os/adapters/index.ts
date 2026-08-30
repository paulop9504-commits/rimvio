import { mockRuntimeAdapter } from "@/lib/hub/dev/experience-os/adapters/mock-adapter";
import type { ExperienceAdapterKind, ExperienceRuntimeAdapter } from "@/lib/hub/dev/experience-os/adapters/types";

export type {
  AuthProviderId,
  AuthProviderState,
  ExperienceAdapterKind,
  ExperienceRuntimeAdapter,
  RuntimeAdapterStatus,
  StorageObjectMeta,
  TableColumn,
} from "@/lib/hub/dev/experience-os/adapters/types";

export {
  defaultColumnsForTable,
  listStorageObjects,
  mockRuntimeAdapter,
  readAuthProviders,
  readTableColumns,
  writeAuthProvider,
  writeStorageObjects,
  writeTableColumns,
} from "@/lib/hub/dev/experience-os/adapters/mock-adapter";

const ADAPTERS: Record<ExperienceAdapterKind, ExperienceRuntimeAdapter> = {
  mock: mockRuntimeAdapter,
  local: mockRuntimeAdapter,
  development: mockRuntimeAdapter,
  production: mockRuntimeAdapter,
};

export function resolveRuntimeAdapter(kind: ExperienceAdapterKind = "mock"): ExperienceRuntimeAdapter {
  return ADAPTERS[kind] ?? mockRuntimeAdapter;
}
