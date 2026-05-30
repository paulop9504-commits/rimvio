import type { Metadata } from "next";
import { BeamPageClient } from "@/components/beam-page-client";
import { resolveBeamSnapshot } from "@/lib/beam/resolve-beam";
import { GLANGO } from "@/lib/brand/glango";

type BeamPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await resolveBeamSnapshot(slug);

  if (!snapshot) {
    return {
      title: `링크를 찾을 수 없어요 · ${GLANGO.name}`,
    };
  }

  const title = snapshot.title?.trim() || GLANGO.name;
  const description =
    snapshot.primary_action_label?.trim() ||
    `${GLANGO.name}에서 바로 실행할 수 있는 링크`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: GLANGO.name,
      ...(snapshot.thumbnail_url
        ? { images: [{ url: snapshot.thumbnail_url, alt: title }] }
        : {}),
    },
    twitter: {
      card: snapshot.thumbnail_url ? "summary_large_image" : "summary",
      title,
      description,
      ...(snapshot.thumbnail_url ? { images: [snapshot.thumbnail_url] } : {}),
    },
  };
}

export default async function BeamPage({ params }: BeamPageProps) {
  const { slug } = await params;
  return <BeamPageClient slug={slug} />;
}
