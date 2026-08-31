import { requireDevPage } from "@/lib/dev/require-dev-page";
import { RimvioDevAgentApp } from "@/components/dev/rimvio-dev-agent/rimvio-dev-agent-app";

export default function RimvioDevAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireDevPage();
  return children;
}
