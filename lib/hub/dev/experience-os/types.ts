export type ResourceStatus =
  | "creating"
  | "ready"
  | "running"
  | "stopped"
  | "error"
  | "deploying"
  | "verifying";

export type ResourceType =
  | "workspace"
  | "database_table"
  | "storage_bucket"
  | "auth_role"
  | "app_user"
  | "function"
  | "job"
  | "secret"
  | "domain"
  | "runtime"
  | "deployment"
  | "environment"
  | "log_event";

export type RimvioResource = {
  readonly id: string;
  readonly projectId: string;
  readonly type: ResourceType;
  readonly name: string;
  readonly status: ResourceStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type ExperienceResourceOp =
  | "workspace.read"
  | "database.listTables"
  | "database.createTable"
  | "storage.listBuckets"
  | "storage.createBucket"
  | "auth.listRoles"
  | "auth.createRole"
  | "user.list"
  | "user.create"
  | "function.list"
  | "function.create"
  | "job.list"
  | "job.create"
  | "secret.list"
  | "secret.set"
  | "runtime.status"
  | "runtime.start"
  | "runtime.stop"
  | "environment.list"
  | "domain.list"
  | "domain.connect"
  | "log.list"
  | "log.append"
  | "verification.run"
  | "capability.invoke"
  | "capability.compose"
  | "deployment.status"
  | "deployment.create"
  | "deployment.rollback"
  | "experience.build";

export type ExperienceResourceResult = {
  readonly ok: boolean;
  readonly op: ExperienceResourceOp;
  readonly data?: unknown;
  readonly errorKo?: string;
};
