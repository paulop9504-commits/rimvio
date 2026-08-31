import { redirect } from "next/navigation";

type HubLoopPageProps = {
  searchParams: Promise<{ platform?: string }>;
};

export default async function HubLoopPage({ searchParams }: HubLoopPageProps) {
  const params = await searchParams;
  const platform = params.platform ? `&platform=${encodeURIComponent(params.platform)}` : "";
  redirect(`/hub/workspace?pane=loops${platform}`);
}
