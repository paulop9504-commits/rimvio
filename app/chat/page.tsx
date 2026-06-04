import { redirect } from "next/navigation";

/** 실시간 1:1 채팅은 ROOM(/peers)에서 진행합니다. */
export default function ChatPage() {
  redirect("/peers");
}
