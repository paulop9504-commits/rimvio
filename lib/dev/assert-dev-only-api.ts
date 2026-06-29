import { NextResponse } from "next/server";

/** Route handlers: return a 404 response in production, otherwise null. */
export function devOnlyApiGuard(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev only" }, { status: 404 });
  }
  return null;
}
