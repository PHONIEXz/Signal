import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readAuthBody, AuthInputError, PRIVATE_HEADERS, requestOrigin } from "@/lib/auth-http";
import { parseMetricCsv } from "@/lib/metrics-csv";
import { metricDate, missingCountFields } from "@/lib/metric-measurements";
import { sampleLimitForPlan } from "@/lib/metrics";
import { metricsSchemaReady, claimMetricSync, finishMetricFailure, storeCollection } from "@/lib/metric-storage";
export async function POST(request:Request,{params}:{params:Promise<{platform:string}>}) {
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Not authenticated"},{status:401,headers:PRIVATE_HEADERS});
  let lockId:string|null=null;let accountId="";
  try {
    const {platform}=await params;if(!["x","facebook","tiktok"].includes(platform))throw new AuthInputError("Unsupported platform.");
    const body=await readAuthBody(request,600000,requestOrigin(request));
    const account=await prisma.connectedAccount.findUnique({where:{userId_platform:{userId:session.user.id,platform}},include:{user:{select:{plan:true,analyticsCollectionEnabled:true}}}});
    if(!account)throw new AuthInputError("Connect this platform before importing.",404);
    if(!account.user.analyticsCollectionEnabled)throw new AuthInputError("Analytics collection is disabled in settings.",403);
    accountId=account.id;
    if(typeof body.csv!=="string")throw new AuthInputError("Choose a CSV file.");
    const capturedAt=metricDate(body.capturedAt);if(!capturedAt||capturedAt.getTime()>Date.now()+60000||capturedAt.getTime()<Date.now()-10*365*86400000)throw new AuthInputError("Specify when these counts were measured, within the last 10 years.");
    let posts;try {posts=parseMetricCsv(body.csv,platform,sampleLimitForPlan(account.user.plan));}catch(error){throw new AuthInputError(error instanceof Error?error.message:"Check the CSV format.");}
    if(body.confirm!==true)return NextResponse.json({preview:true,posts:posts.length,missingFields:missingCountFields(posts),examples:posts.slice(0,3).map(p=>({id:p.id,text:p.text.slice(0,160)})),warning:"Imported counts are user-supplied, not verified by the platform. They do not update live account totals."},{headers:PRIVATE_HEADERS});
    if(!await metricsSchemaReady())throw new AuthInputError("Metrics storage needs its database upgrade.",503);
    lockId=await claimMetricSync(account.id,session.user.id,account.user.plan,posts.length);
    if(!lockId)throw new AuthInputError("A collection is running or the refresh/import cooldown is active. Try again later.",429);
    const result=await storeCollection({accountId:account.id,lockId,platform,posts,requested:posts.length,complete:true,source:"CSV",capturedAt,warning:"User-imported CSV measurements. Live account totals were not changed."});
    return NextResponse.json(result,{headers:PRIVATE_HEADERS});
  } catch(error) {
    if(lockId)await finishMetricFailure(accountId,lockId,"CSV import did not complete. Existing measurements were preserved.").catch(()=>{});
    return NextResponse.json({error:error instanceof AuthInputError?error.message:"Import did not complete; existing data was preserved."},{status:error instanceof AuthInputError?error.status:500,headers:PRIVATE_HEADERS});
  }
}
