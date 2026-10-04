import { refreshCreatorMetrics } from "@/lib/creator-refresh";
export const maxDuration=180;
export async function POST(request:Request) { return refreshCreatorMetrics(request,"youtube"); }
