import { NextResponse } from "next/server";

export async function GET() {
  const url =
    process.env.RIMVIO_PC_SETUP_URL?.trim() ||
    process.env.NEXT_PUBLIC_RIMVIO_PC_SETUP_URL?.trim() ||
    "";
  const filename = "Rimvio-Setup.exe";
  if (!url) {
    return NextResponse.json({
      available: false,
      filename,
    });
  }
  return NextResponse.json({
    available: true,
    url,
    filename,
  });
}
