import { Suspense } from "react";
import { AgentHomeRoute } from "@/components/agent/agent-home-client";

/** Agent-first home — Cursor-style 2D workspace; legacy globe at `?surface=globe`. */
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <AgentHomeRoute />
    </Suspense>
  );
}
