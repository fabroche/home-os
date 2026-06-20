import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Healthcheck para Docker/Dokploy. */
export function GET() {
  return NextResponse.json({ status: "ok", service: "home-os", ts: new Date().toISOString() });
}
