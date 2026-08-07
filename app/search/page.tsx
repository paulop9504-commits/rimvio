import { redirect } from "next/navigation";

/** Legacy /search hub → Globe composer (search · capture absorbed into prompt). */
export default function SearchPage() {
  redirect("/");
}
