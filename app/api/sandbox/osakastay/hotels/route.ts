import { NextResponse } from "next/server";
import { OSAKASTAY_HOTELS } from "@/lib/dev/rimvio-dev-agent/fixtures";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = (searchParams.get("location") ?? "오사카").toLowerCase();

  const hotels = OSAKASTAY_HOTELS.filter((hotel) => {
    if (!location || location.includes("오사카") || location.includes("osaka")) {
      return true;
    }
    return hotel.location.toLowerCase().includes(location);
  });

  const expanded = [...hotels, ...hotels].slice(0, 8);

  return NextResponse.json({
    count: expanded.length,
    hotels: expanded,
  });
}
