import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { readAuthBody, requestOrigin, PRIVATE_HEADERS, AuthInputError } from "@/lib/auth-http";
import { changeSchedule } from "@/lib/draft-scheduling";
import { PublishError } from "@/lib/content-publishing";
import { takeAuthQuota } from "@/lib/password-reset";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const session=await auth();
  if(!session?.user?.id) return NextResponse.json({error:"Sign in first."},{status:401,headers:PRIVATE_HEADERS});
  try {
    const body=await readAuthBody(request,4096,requestOrigin(request));
    if (!await takeAuthQuota("schedule",session.user.id,30,15*60000)) throw new AuthInputError("Wait before changing more schedules.",429);
    if ((body.action!=="schedule" && body.action!=="cancel") || body.confirm!==true || typeof body.expectedUpdatedAt!=="string") throw new AuthInputError("Confirm the saved draft and its schedule.");
    const version=new Date(body.expectedUpdatedAt);
    if (!Number.isFinite(version.getTime())) throw new AuthInputError("Refresh this draft first.");
    const result=await changeSchedule(session.user.id,(await params).id,version,body.action,typeof body.scheduledFor==="string"?body.scheduledFor:undefined);
    return NextResponse.json(result,{headers:PRIVATE_HEADERS});
  } catch(error) {
    return NextResponse.json({error:error instanceof AuthInputError || error instanceof PublishError ? error.message : "Could not change the schedule. Refresh and try again."},{status:error instanceof AuthInputError?error.status:error instanceof PublishError && error.code==="NOT_FOUND"?404:409,headers:PRIVATE_HEADERS});
  }
}
