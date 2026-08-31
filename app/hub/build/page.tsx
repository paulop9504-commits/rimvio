import { redirect } from "next/navigation";

export default function HubBuildRedirect() {
  redirect("/hub/workspace?pane=ade");
}
