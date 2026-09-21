import { cookies } from "next/headers";
import { decrypt } from "./encryption.ts";
export async function pendingFacebookToken(userId: string) {
  try {
    const raw=(await cookies()).get("fb_page_selection")?.value;
    if (!raw) return null;
    const data=JSON.parse(decrypt(raw));
    if(data.userId!==userId || typeof data.token!=="string" || typeof data.expiresAt!=="number" || data.expiresAt<Date.now()) return null;
    return data.token as string;
  } catch { return null; }
}
export async function facebookPages(token: string) {
  const pages: {id:string;name:string;access_token:string}[]=[];
  let after: string | undefined;
  for(let i=0;i<5;i++) {
    const url=new URL("https://graph.facebook.com/v26.0/me/accounts");
    url.searchParams.set("fields","id,name,access_token"); url.searchParams.set("limit","100");
    if(after) url.searchParams.set("after",after);
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(!response.ok) throw new Error("Page discovery failed");
    const data=await response.json();
    if(!Array.isArray(data.data)) throw new Error("Invalid Page response");
    for(const page of data.data) if(typeof page.id==="string" && typeof page.access_token==="string") pages.push({id:page.id,name:typeof page.name==="string"?page.name:"Facebook Page",access_token:page.access_token});
    const next=data.paging?.cursors?.after;
    if(!data.paging?.next || typeof next!=="string" || next===after) break;
    after=next;
  }
  return pages;
}
