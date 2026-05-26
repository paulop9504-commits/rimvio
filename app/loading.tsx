import { ActionCardSkeletonList } from "@/components/action-card-skeleton";
import { AppShell } from "@/components/app-shell";

export default function Loading() {
  return (
    <AppShell title="Actions" subtitle="One tap from link to done">
      <ActionCardSkeletonList count={3} />
    </AppShell>
  );
}
