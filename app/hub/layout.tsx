import type { ReactNode } from "react";

export default function HubLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh overflow-hidden">{children}</div>;
}
