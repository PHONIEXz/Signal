import Link from "next/link";
import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";
import LegalLinks from "@/components/LegalLinks";
import SupportContact from "@/components/SupportContact";

export const metadata: Metadata = {
  title: "Terms of Service | Signal",
  description: "The terms that apply when creating an account or connecting a social platform to Signal.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
      <header className="flex items-center">
        <Link href="/" aria-label="Signal home"><BrandMark /></Link>
      </header>
      <article className="mt-12 border-t-2 border-navy bg-surface px-6 py-9 sm:px-12 sm:py-12">
      <p className="eyebrow">Signal / Legal</p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.04em] text-ink sm:text-5xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: September 2026</p>

      <div className="mt-10 flex flex-col gap-8 border-t border-border pt-8 text-sm leading-7 text-ink [&_section]:border-b [&_section]:border-border [&_section]:pb-8 [&_section:last-child]:border-0 [&_section:last-child]:pb-0 [&_h2]:text-xl">
        <section>
          <h2 className="font-display text-base font-medium text-ink">
            1. Acceptance of terms
          </h2>
          <p className="mt-2 text-ink-muted">
            By creating an account or using Signal (&quot;the Service&quot;), you agree
            to these Terms of Service. If you do not agree, do not use the
            Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            2. Description of the service
          </h2>
          <p className="mt-2 text-ink-muted">
            Signal lets you connect your own social media accounts (such as X,
            Facebook, and TikTok) and view analytics about those accounts -
            such as follower counts, post engagement, and growth trends - in
            one dashboard.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            3. Connected accounts
          </h2>
          <p className="mt-2 text-ink-muted">
            When you connect a third-party platform account, you authorize
            Signal to read data from that account on your behalf, using the
            permissions you explicitly grant during that platform&apos;s own
            authorization process. Signal only reads data - it does not post,
            follow, or perform actions on your connected accounts unless a
            feature explicitly says otherwise. You can disconnect any account
            at any time from your dashboard.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            4. Your responsibilities
          </h2>
          <p className="mt-2 text-ink-muted">
            You&apos;re responsible for keeping your login credentials secure and
            for all activity under your account. You agree to use the Service
            only for lawful purposes and in accordance with the terms of
            service of any third-party platform you connect.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            5. Termination
          </h2>
          <p className="mt-2 text-ink-muted">
            You may stop using the Service and delete your account at any
            time. We may suspend or terminate access to the Service if these
            terms are violated.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            6. Disclaimer and limitation of liability
          </h2>
          <p className="mt-2 text-ink-muted">
            The Service is provided &quot;as is&quot; without warranties of any kind.
            Signal is not responsible for the accuracy of data returned by
            third-party platforms, or for any action taken by those platforms
            (such as API changes, rate limits, or account restrictions) that
            affects the Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            7. Changes to these terms
          </h2>
          <p className="mt-2 text-ink-muted">
            These terms may be updated from time to time. Continued use of the
            Service after changes are posted constitutes acceptance of the
            revised terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-medium text-ink">
            8. Contact
          </h2>
          <p className="mt-2 text-ink-muted">
            Questions about these terms can be sent using <SupportContact />.
          </p>
        </section>
      </div>
      </article>
      <footer className="mt-8"><LegalLinks /></footer>
      </div>
    </main>
  );
}
