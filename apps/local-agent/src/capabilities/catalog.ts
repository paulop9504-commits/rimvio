/** Capability catalog mirror for local agent installs. */

export type CapabilityInstallKind = "bundled" | "npm_module" | "browser_extension";

export type CapabilitySpec = {
  id: string;
  name: string;
  installKind: CapabilityInstallKind;
  npmPackage?: string;
};

export const CAPABILITY_SPECS: CapabilitySpec[] = [
  {
    id: "browser.basic",
    name: "Browser Basic",
    installKind: "bundled",
  },
  {
    id: "demo.module",
    name: "Demo Module",
    installKind: "bundled",
  },
  {
    id: "file.pdf",
    name: "PDF Reader",
    installKind: "npm_module",
    npmPackage: "pdf-parse",
  },
  {
    id: "browser.connector",
    name: "Browser Connector",
    installKind: "browser_extension",
  },
];

const byId = new Map(CAPABILITY_SPECS.map((c) => [c.id, c]));

export function getCapabilitySpec(id: string): CapabilitySpec | undefined {
  return byId.get(id);
}
