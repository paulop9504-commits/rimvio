import { Suspense } from "react";
import { HubDataSupplierWorkspace } from "@/components/hub/data/hub-data-supplier-workspace";

export default function HubDataSupplierPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f8fafc]" />}>
      <HubDataSupplierWorkspace />
    </Suspense>
  );
}
