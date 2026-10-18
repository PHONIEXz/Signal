import Link from "next/link";
import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";
import LegalLinks from "@/components/LegalLinks";
import SupportContact from "@/components/SupportContact";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | Signal",
  description: "Delete your connected Facebook data or request deletion of your Signal account.",
};
export default function DataDeletionPage() {
  return <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-3xl">
    <Link href="/" aria-label="Signal home"><BrandMark /></Link>
    <article className="surface-card mt-10 space-y-8 p-6 text-sm leading-7 text-ink sm:p-10">
      <header><p className="section-kicker">Privacy & control</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Data deletion instructions</h1><p className="mt-2 text-ink-muted">Updated October 18, 2026</p></header>
      <section><h2 className="text-xl font-bold">Delete your connected Facebook data</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5"><li>Sign in to Signal and open <Link href="/dashboard/accounts" className="font-semibold text-navy underline">Connected accounts</Link>.</li><li>Find your Facebook Page and choose <strong>Unlink</strong>.</li><li>Read the deletion warning and confirm. Signal removes the connection and its related saved data from the active database. The Facebook card disappears when the page reloads successfully.</li></ol>
        <p className="mt-3 text-ink-muted">This deletes the saved Page token, imported posts and measurements, follower and post-count history, Page insights, draft-to-Page links and related publishing records. It stops new collection for this connection. It does not delete your Facebook Page or posts on Facebook. Your Signal login, other connected platforms and saved drafts remain. Reconnecting starts a new connection; deleted Signal history is not restored.</p>
      </section>
      <section><h2 className="text-xl font-bold">Remove permission on Facebook too</h2><p className="mt-3 text-ink-muted">Unlinking in Signal does not itself revoke the app permission in Meta. You can separately remove the app from Facebook&apos;s Business Integrations settings. If you only remove it on Facebook, also unlink it in Signal or contact us to delete Signal&apos;s stored data.</p></section>
      <section><h2 className="text-xl font-bold">Request full Signal account deletion</h2><p className="mt-3 text-ink-muted">Email <SupportContact /> from your registered Signal email address with the subject <strong>Signal data deletion request</strong>. Say whether you want to delete only Facebook data or your whole Signal account, including drafts and other connections. We verify ownership and handle these requests manually; submitting an email does not instantly delete your account.</p><p className="mt-3 text-ink-muted">If you cannot sign in or access that email, contact the same address and explain the problem. Do not send passwords, access tokens, identity documents or recovery codes. We will explain any additional ownership checks needed.</p></section>
      <section><h2 className="text-xl font-bold">Scope and confirmation</h2><p className="mt-3 text-ink-muted">For manual requests, we reply when the request is completed or if more information is needed. Copies you exported, content on Facebook, and data already processed by other providers are outside the unlink action. Provider backups and operational records can have separate retention. We do not promise immediate erasure from every backup or third-party system.</p></section>
      <Link href="/privacy" className="inline-flex min-h-11 items-center font-semibold text-navy underline">Read the privacy policy</Link>
    </article><footer className="mt-8"><LegalLinks /></footer>
  </div></main>;
}
