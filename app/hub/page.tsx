import Link from "next/link";
import { HubDevPlatformsHome } from "@/components/hub/dev/hub-dev-platforms-home";

export const metadata = {
  title: "Rimvio Dev Hub",
  description: "Teach Rimvio new abilities",
};

export default function HubPage() {
  return (
    <div>
      <div className="flex items-center justify-end border-b px-4 py-2" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <Link href="/hub/workspace" className="text-[12px] font-semibold text-[#6b4cff]">
          Open Dev Hub MVP →
        </Link>
      </div>
      <HubDevPlatformsHome />
    </div>
  );
}
