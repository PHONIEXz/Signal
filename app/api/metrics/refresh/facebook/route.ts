import { refreshMetrics } from "@/lib/metrics-refresh";
export const maxDuration = 180;
export async function POST(request: Request) { return refreshMetrics(request, "facebook"); }
