import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { pendingFacebookToken, facebookPages } from "@/lib/facebook-selection";
import { saveConnection, ConnectionIdentityError } from "@/lib/save-connection";
import { getAccountConnectionAccess } from "@/lib/account-access";
import { encrypt } from "@/lib/encryption";
import Link from "next/link";
import PageIntro from "@/components/dashboard/PageIntro";

async function selectPage(form: FormData) {
  "use server";
  const session=await auth();
  if(!session?.user?.id) redirect("/login");
  const token=await pendingFacebookToken(session.user.id);
  if(!token) redirect("/dashboard/accounts?error=facebook_state_mismatch");
  if(!(await getAccountConnectionAccess(session.user.id,"facebook")).allowed) redirect("/dashboard/accounts?error=free_account_limit");
  let destination="/dashboard/accounts?connected=facebook";
  try {
    const page=(await facebookPages(token)).find(page=>page.id===form.get("pageId"));
    if(!page) throw new Error("Invalid selection");
    await saveConnection(session.user.id,"facebook",{platformUserId:page.id,displayName:page.name,accessToken:encrypt(page.access_token),expiresAt:null});
  } catch(error) { destination=`/dashboard/accounts?error=${error instanceof ConnectionIdentityError ? "account_identity_mismatch" : "facebook_connect_failed"}`; }
  (await cookies()).delete("fb_page_selection");
  redirect(destination);
}
export default async function FacebookSelection() {
  const session=await auth();
  if(!session?.user?.id) redirect("/login");
  const token=await pendingFacebookToken(session.user.id);
  if(!token) redirect("/dashboard/accounts?error=facebook_state_mismatch");
  let pages;
  try { pages=await facebookPages(token); } catch { redirect("/dashboard/accounts?error=facebook_connect_failed"); }
  return <div className="mx-auto max-w-2xl space-y-8">
    <PageIntro eyebrow="Workspace / Connections" title="Choose your Facebook Page" description="Select the Page whose posts and insights you want in Signal. When reconnecting, choose your original Page to preserve its history." />
    {!pages.length ? <p className="editorial-panel p-6 text-sm text-ink-muted">No manageable Pages were returned. Check your Page access and reconnect.</p> : <form action={selectPage} className="editorial-panel space-y-5 p-6"><label className="block text-sm font-semibold text-ink" htmlFor="pageId">Facebook Page</label><select id="pageId" name="pageId" required className="w-full rounded-md border border-border bg-surface p-3 text-ink">{pages.map(page=><option key={page.id} value={page.id}>{page.name} ({page.id})</option>)}</select><button className="rounded-md bg-action px-4 py-3 text-sm font-semibold text-white hover:bg-action-hover">Connect selected Page</button></form>}
    <Link href="/dashboard/accounts" className="inline-block text-sm font-semibold text-navy underline underline-offset-4">Back to accounts</Link>
  </div>;
}
