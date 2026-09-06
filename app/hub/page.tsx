import Link from "next/link";
import { HubDevPlatformsHome } from "@/components/hub/dev/hub-dev-platforms-home";

export const metadata = {
  title: "Rimvio Dev Hub",
  description: "Teach Rimvio new abilities",
};

export default function HubPage() {
  return (
    <div>
      <div className="flex items-center justify-end gap-3 border-b px-4 py-2" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <Link href="/hub/harness/builder" className="text-[12px] font-semibold text-[#0F172A]">
          Harness Builder
        </Link>
        <Link href="/hub/harness/labeller" className="text-[12px] font-semibold text-[#0F172A]">
          Harness Labeller
        </Link>
        <Link href="/hub/workspace" className="text-[12px] font-semibold text-[#6b4cff]">
          Open Rimvio Dev Agent →
        </Link>
      </div>
      <HubDevPlatformsHome />
    </div>
  );
}
