import { requireDevPage } from "@/lib/dev/require-dev-page";

export default function CapabilityWorkspaceDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireDevPage();
  return children;
}
