import { redirect } from "next/navigation";

export default function HubCapabilitySubmitRedirect() {
  redirect("/hub/workspace?nav=capabilities");
}
