// A manual pipeline trigger for the password-protected dashboard. Keep this
// separate from /api/run: cron still uses CRON_SECRET, while this route is
// guarded by middleware.js together with the rest of the dashboard.

import { NextResponse } from "next/server";
import { runPipeline } from "../../../lib/pipeline.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const result = await runPipeline();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
