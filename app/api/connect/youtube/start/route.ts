import { creatorStart } from "@/lib/creator-oauth";
export async function GET() { return creatorStart("youtube"); }
