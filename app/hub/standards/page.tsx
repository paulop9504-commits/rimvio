import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

/** Deep link alias → Hub Dev Workspace Standards pane. */
export default async function HubStandardsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view = params.view ?? "overview";
  redirect(`/hub/workspace?pane=standards&standards=${view}`);
}
