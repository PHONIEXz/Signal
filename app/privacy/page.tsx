import Link from "next/link";
import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";
import LegalLinks from "@/components/LegalLinks";
import SupportContact from "@/components/SupportContact";

export const metadata: Metadata = {
  title: "Privacy Policy | SocialPanora",
  description: "How SocialPanora collects, uses, protects and deletes account and social analytics data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="SocialPanora home"><BrandMark /></Link>
      </header>
      <article className="surface-card mt-10 p-6 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy">Legal</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: October 18, 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="font-display text-base font-medium text-ink">
            1. Information we collect
          </h2>
          <p className="mt-2 text-ink-muted">
            When you create an account, we collect your name and email
            address (or the information provided by Google if you sign in
            that way). When you connect a social media account, we receive
            and store an access token for that account, along with Page or account identifiers, display names, posts and
            metrics the platform makes available through your authorization
            - such as follower counts, post text, and engagement numbers
            (likes, views, replies, shares). We also store content drafts and
            attachments you choose to save in SocialPanora.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            2. How we use your information
          </h2>
          <p className="mt-2 text-ink-muted">
            We use this information solely to operate the Service: to
            authenticate you, to fetch and display your own social media
            metrics back to you, to save your drafts and deliver content when
            you explicitly request a supported publishing action, and - if
            you use optional AI features - to answer questions or generate
            reports about your available account data.
            We do not use your data for advertising, and we do not sell your
            data to third parties.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            3. How we store your information
          </h2>
          <p className="mt-2 text-ink-muted">
            Access tokens for connected accounts are encrypted before being
            stored. Access to the underlying database is restricted. Your
            login password (if you use email/password sign-in) is hashed and
            never stored in plain text.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            4. Third-party services
          </h2>
          <p className="mt-2 text-ink-muted">
            The Service connects to X, Facebook and TikTok to read data you
            authorize. When you explicitly request a supported publishing
            action, SocialPanora sends that content to the selected platform. SocialPanora
            does not publish TikTok drafts; you complete those on TikTok. If
            you use optional AI features, your request and relevant account
            data are sent to Google&apos;s Gemini API to generate a response.
            Hosting and database providers, including Vercel and Turso, process data to run SocialPanora. Access tokens and passwords are not included in AI prompts.
            These providers have their own privacy policies governing how
            they handle that data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            5. Your choices
          </h2>
          <p className="mt-2 text-ink-muted">
            You can disconnect any connected account at any time from your
            dashboard. Unlinking Facebook deletes that connection, its saved access token, posts, post measurements, metric history, Page insights and related publishing records from SocialPanora&apos;s active database. It stops new collection for that connection. Your saved SocialPanora drafts remain until separately deleted, and posts already published on Facebook are not deleted.
            Disabling analytics in Settings pauses new collection without deleting saved history. Data remains available while your connection is active until you unlink it or request deletion.
            For full SocialPanora account deletion, contact us from your registered email address. These requests are handled manually after ownership verification.
            See the <Link href="/data-deletion" className="font-semibold text-navy underline">data deletion instructions</Link> for the steps and scope.
            Provider backups and operational records may have separate retention; we do not promise immediate removal from every backup or from third-party systems.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            6. Children&apos;s privacy
          </h2>
          <p className="mt-2 text-ink-muted">
            The Service is not directed at children under 13, and we do not
            knowingly collect information from them.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            7. Changes to this policy
          </h2>
          <p className="mt-2 text-ink-muted">
            This policy may be updated from time to time. Material changes
            will be reflected by updating the &quot;Last updated&quot; date above.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            8. Contact
          </h2>
          <p className="mt-2 text-ink-muted">
            Questions about this policy or requests regarding your data can be
            sent using <SupportContact />.
          </p>
        </section>
      </div>
      </article>
      <footer className="mt-8"><LegalLinks /></footer>
      </div>
    </main>
  );
}
