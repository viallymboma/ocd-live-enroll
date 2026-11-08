import { NextResponse, type NextRequest } from "next/server";

import { storageEnabled, storeImage, UploadError } from "@/server/storage";

export const dynamic = "force-dynamic";

// Light per-instance limit: 30 images per address per 10 minutes.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

/** POST one image (multipart "file") → { key }. The browser shrinks photos before sending. */
export async function POST(req: NextRequest) {
  if (!storageEnabled()) return NextResponse.json({ error: "storage-off" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "rate" }, { status: 429 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "type" }, { status: 400 });
    const key = await storeImage(file);
    return NextResponse.json({ key });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[upload]", e);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ enabled: storageEnabled() });
}
