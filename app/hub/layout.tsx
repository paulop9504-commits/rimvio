import type { ReactNode } from "react";

export default function HubLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-[#0c0e12]">{children}</div>;
}
