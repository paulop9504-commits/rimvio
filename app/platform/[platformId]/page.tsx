import { PlatformRuntimeClient } from "@/components/platform/platform-runtime-client";

export const metadata = {
  title: "Platform",
};

type PageProps = {
  params: Promise<{ platformId: string }>;
};

export default async function PlatformRuntimePage({ params }: PageProps) {
  const { platformId } = await params;
  return <PlatformRuntimeClient platformId={decodeURIComponent(platformId)} />;
}
