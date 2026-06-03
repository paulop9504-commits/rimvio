import { redirect } from "next/navigation";

/** Canonical feed entry — protected as /feed via route alias. */
export default function Home() {
  redirect("/feed");
}
