/**
 * Reality Data Network — supplier / verifier workspace panes.
 */

export type DataSupplierPane = "overview" | "submit" | "submissions" | "earnings";

export type DataVerifierPane = "overview" | "task_pool" | "reviews" | "earnings" | "profile";

export type DataSupplierNavItem = {
  readonly id: DataSupplierPane;
  readonly label: string;
  readonly icon: string;
};

export type DataVerifierNavItem = {
  readonly id: DataVerifierPane;
  readonly label: string;
  readonly icon: string;
};

export const DATA_SUPPLIER_NAV: readonly DataSupplierNavItem[] = [
  { id: "overview", label: "Overview", icon: "layout" },
  { id: "submit", label: "Submit", icon: "upload" },
  { id: "submissions", label: "My Submissions", icon: "inbox" },
  { id: "earnings", label: "Earnings", icon: "wallet" },
];

export const DATA_VERIFIER_NAV: readonly DataVerifierNavItem[] = [
  { id: "overview", label: "Overview", icon: "layout" },
  { id: "task_pool", label: "Task Pool", icon: "list" },
  { id: "reviews", label: "My Reviews", icon: "check" },
  { id: "earnings", label: "Earnings", icon: "wallet" },
  { id: "profile", label: "Profile", icon: "user" },
];

export function parseDataSupplierPane(raw: string | null): DataSupplierPane {
  const map: Record<string, DataSupplierPane> = {
    overview: "overview",
    submit: "submit",
    submissions: "submissions",
    earnings: "earnings",
  };
  if (raw && raw in map) return map[raw]!;
  return "overview";
}

export function parseDataVerifierPane(raw: string | null): DataVerifierPane {
  const map: Record<string, DataVerifierPane> = {
    overview: "overview",
    task_pool: "task_pool",
    pool: "task_pool",
    reviews: "reviews",
    earnings: "earnings",
    profile: "profile",
  };
  if (raw && raw in map) return map[raw]!;
  return "overview";
}
