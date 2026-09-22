import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runPublishingQueue } from "@/lib/publishing-worker";
import { PRIVATE_HEADERS } from "@/lib/auth-http";
export const runtime="nodejs";
export const maxDuration=120;
export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET?.trim();
  const actual=Buffer.from(request.headers.get("authorization") ?? "");
  const expected=Buffer.from(`Bearer ${secret}`);
  if(!secret || actual.length!==expected.length || !timingSafeEqual(actual,expected)) return NextResponse.json({error:"Unauthorized"},{status:401,headers:PRIVATE_HEADERS});
  try { return NextResponse.json(await runPublishingQueue(),{headers:PRIVATE_HEADERS}); }
  catch { return NextResponse.json({error:"Queue processing failed."},{status:503,headers:PRIVATE_HEADERS}); }
}
