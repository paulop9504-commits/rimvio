import { NextResponse, type NextRequest } from "next/server";
import { hubConnectionsJsonResponse } from "@/lib/hub/dev/hub-oauth-callback-handler";

export async function GET(request: NextRequest) {
  return hubConnectionsJsonResponse(request);
}
