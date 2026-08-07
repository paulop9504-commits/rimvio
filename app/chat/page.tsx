import { redirect } from "next/navigation";

/** Legacy /chat → Globe home composer */
export default function ChatPage() {
  redirect("/");
}
