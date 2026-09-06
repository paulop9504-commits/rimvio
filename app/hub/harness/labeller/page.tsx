import { HarnessLabellerSandboxApp } from "@/components/hub/harness/harness-labeller-sandbox-app";

export const metadata = {
  title: "Harness Labeller · Rimvio Hub",
  description: "Web or Local sandbox labelling for Rimvio Harness",
};

export default function HubHarnessLabellerPage() {
  return <HarnessLabellerSandboxApp />;
}
