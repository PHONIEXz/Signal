import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="font-display text-lg font-medium text-ink">
        Signal
      </Link>
      <h1 className="mt-8 font-display text-2xl font-medium text-ink">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: August 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink">
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
            Questions about these terms can be sent to [your contact email].
          </p>
        </section>
      </div>
    </div>
  );
}

