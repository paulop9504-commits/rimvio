import { redirect } from "next/navigation";

/** 기본 홈 — 친구(ROOM) 우선. 실행(피드)은 하단 탭. */
export default function Home() {
  redirect("/peers");
}
