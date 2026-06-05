import { redirect } from "next/navigation";

/** 기본 홈 — 피드(HQ) 우선. */
export default function Home() {
  redirect("/feed");
}
