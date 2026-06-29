import { notFound } from "next/navigation";

/** Server component guard — dev-only pages return 404 in production builds. */
export function requireDevPage(): void {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
}
