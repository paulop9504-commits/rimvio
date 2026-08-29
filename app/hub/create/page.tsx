import { redirect } from "next/navigation";

export default function HubCreateRedirect() {
  redirect("/hub/workspace?pane=ade");
}
