import { NextRequest } from "next/server";
import { creatorCallback } from "@/lib/creator-oauth";
export async function GET(request:NextRequest) { return creatorCallback(request, "youtube"); }
