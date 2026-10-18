# Signal: Facebook review preparation

Prepared October 18, 2026. This is a preparation packet, not a submitted application or a compliance certification. Recheck the current Meta dashboard before submitting. Official Meta documentation was rate-limited during preparation; permission mappings below are based on Signal's actual code and must be confirmed against Meta's current permission requirements.

## Status and release gates

| Item | Current evidence | Remaining work |
| --- | --- | --- |
| Business verification | Dashboard says Signal - Phoenix Enterprise is unverified; owner says the business is unregistered | Obtain accepted, genuine documentation matching the business details; do not invent a registration or substitute another business |
| Tech Provider access verification | Dashboard says business verification must finish first | Complete the actual access-verification questions after it unlocks |
| Production application | https://signal-phoenix-dashboard.vercel.app/ | Confirm successful production deployment for this change |
| Public privacy and deletion instructions | `/privacy` and `/data-deletion`; linked from legal navigation and Settings | Open both without login in production |
| Facebook authorization | Login for Business using FACEBOOK_CONFIG_ID; CSRF state check; Page selection before saving an encrypted Page token | Confirm production FACEBOOK_APP_ID and configuration belong to the exact Meta app being reviewed, currently shown as Signal Backup |
| Scope and access | Permissions come from the Meta Login for Business configuration, not hard-coded URL scopes | Inspect configuration and request only permissions whose features are demonstrated |
| Deletion | Authenticated unlink deletes the owner's Facebook connection and cascading related data; explicit destructive warning | Run one disposable live Page test only after approval to lose that connection's Signal history |
| Meta-side revocation | User instructions explain removing the integration in Meta separately | No automatic Meta deauthorization or signed-request deletion callback is implemented; never enter an invented callback URL |
| Full account deletion | Manual support request described publicly | Owner must monitor the displayed support mailbox and operate the ownership/deletion procedure below |
| AI data handling | Optional questions/reports send relevant saved account/post data to Gemini; credentials are excluded | Confirm permitted use and required disclosures under current Meta terms, provider terms and dashboard questions. Privacy disclosure alone does not establish permission |
| Reviewer access | Normal Signal authentication exists | Create a dedicated reviewer Signal account; check email verification and login; provide credentials only in Meta's private reviewer instructions |
| Video | Recording script below | Record actual successful use, not mocked metrics or local test fixtures |
| Submission | Not submitted | Finish verification, evidence and dashboard requirements first |

## URLs to copy into the matching dashboard fields

- Website: https://signal-phoenix-dashboard.vercel.app/
- Privacy policy: https://signal-phoenix-dashboard.vercel.app/privacy
- Terms: https://signal-phoenix-dashboard.vercel.app/terms
- User data deletion **instructions**: https://signal-phoenix-dashboard.vercel.app/data-deletion
- Facebook OAuth redirect: https://signal-phoenix-dashboard.vercel.app/api/connect/facebook/callback

Use the deletion URL only in an instructions-URL field. It is a human-readable page, not a signed-request callback endpoint. If the selected Meta configuration requires a callback rather than instructions, implement and test that separately before submission.

Confirm the public support email shown on the site is owned and monitored. SUPPORT_EMAIL overrides the existing default contact. Do not change the app's production secrets merely to match a screenshot; first verify which app and configuration currently issue its tokens.

## Product description draft

Signal lets a signed-in user connect a Facebook Page they manage, choose that Page, and view its available follower metrics, recent Page posts and engagement measurements. Signal stores timestamped observations for growth history and labels unavailable measurements rather than inventing values. Users can request deeper reports or ask questions about available data. Publishing is a separate user-confirmed action. Users can unlink the Page to delete its saved Signal connection and related data.

## Permission explanations: use only for permissions actually requested

The exact permissions, dependencies and available access levels must be checked in the current Meta configuration and reference. These are code-aligned drafts, not evidence of an approval.

### pages_show_list

Signal uses this permission to show the Facebook Pages available to the person who authorizes the connection. After authorization, the person chooses one Page in Signal. Signal retrieves Page identifiers and names through `/me/accounts` and stores the selected Page connection. The reviewer can observe this in Dashboard > Accounts > Connect Facebook > Choose your Facebook Page.

### pages_read_engagement

Signal uses this permission to retrieve the selected Page's available metadata, follower metrics, published Page posts and aggregate engagement measurements for an analytics dashboard. The data is displayed on the connected Facebook account and posts pages and stored as timestamped history. A successful refresh shows the fetched time and available measurements; permission-denied or missing fields are disclosed. Signal does not claim access to private messages or visitors' profiles.

Confirm any additional permission needed for a particular aggregate comments/reactions field through a live authorized request. Do not request pages_read_user_content simply because an unrelated guide lists it; the current collector reads the Page's own `/posts` and aggregate counts, not visitor-post or comment-text moderation features.

### read_insights

Signal uses Page insights for the selected Page's available daily `page_media_view` measurements. It fetches these through the Page `/insights` endpoint and displays the available Page-level value and timestamp in sync details. These values are distinct from per-post views. The reviewer should see a real successful insight fetch; if this metric cannot be retrieved for the test Page, resolve that before claiming to demonstrate the permission.

### pages_manage_posts: only if publishing is in the submission

Signal uses this permission when the signed-in user explicitly publishes an eligible text draft or supported link attachment to their selected Facebook Page. Saving a draft does not publish it. The reviewer should see the draft, the selected Page, the explicit publish action and the resulting post on Facebook. This permission must not be requested on the basis of a planned feature alone. Do not promise image/video support that the implemented publishing flow does not provide.

Do not add messaging, advertising, business-management, Threads or Instagram permission requests unless their actual use and required dependencies have been established. The screenshot includes a Threads use case, but this preparation packet covers Facebook Pages only.

## Private reviewer instructions draft

Fill the bracketed values only after testing. Do not paste this unfinished draft as a completed submission.

1. Visit https://signal-phoenix-dashboard.vercel.app/login.
2. Sign in using the dedicated Signal reviewer account: [private reviewer email and password]. Do not use or disclose the owner's Facebook password.
3. Open Dashboard > Accounts. Ensure the reviewer account has room under its plan's connection limit; a Free account allows one connection.
4. Choose Connect Facebook and complete Meta's authorization flow with the reviewer-supported Page/testing setup required by the current dashboard. Document exactly how the reviewer obtains authorized Page access; do not assume access to the developer's Page.
5. Select the authorized test Page and connect it. Open that Page's account details.
6. Refresh metrics if the cooldown/usage allowance permits. Show the latest refresh timestamp, saved history, recent posts and sync details. Do not repeatedly refresh during recording.
7. Open View account report. Confirm the same account and sample are selected. Generate only when ready; opening the report does not trigger generation. Explain the optional AI processing accurately and only demonstrate it once permitted data handling is confirmed.
8. If requesting publishing, open Content Studio, create a harmless clearly-labelled test draft, explicitly publish to the authorized test Page and confirm the post on Facebook. Obtain Page-owner authorization first. Do not publish to the owner's live Page without consent.
9. To demonstrate deletion, use a disposable connection: Dashboard > Accounts > Facebook > Unlink > confirm. This deletes that connection's Signal history. Confirm the card disappears and other connections/drafts remain. Do not use the owner's historical connection for this demonstration without consent.
10. Public instructions: /data-deletion. Manual support requests go to the contact displayed there. Meta permission removal is separate from Signal unlink.

## Recording script and evidence checklist

Use real data and visible actions. Keep the recording focused and readable; do not record secrets, tokens, personal recovery codes or private reviewer credentials. There is no claimed mandatory video duration here; follow the dashboard's actual upload requirements.

1. Show the Signal home page and briefly state the single purpose: authorized Facebook Page analytics.
2. Start from the Accounts screen and show the Facebook authorization/consent screens, Page list and selection. Avoid splicing away a required permission action.
3. Open the selected Page dashboard. Show one successful refresh, the timestamp, posts and sync details. Describe each requested read permission while its result is visible.
4. Show that the Reports button carries the Page and sample, and that generation is on demand. Include this only after the data-handling gate is cleared.
5. If requesting pages_manage_posts, show an authorized real publish and the resulting Facebook post. Otherwise omit publishing and its permission claim.
6. Show /privacy and /data-deletion without login, then the unlink warning. Confirm deletion only on the disposable test connection.
7. Finish by explaining the role of each requested permission and any honest limitations.

Save an evidence ledger alongside the final submission: recording filename, recording date/time/timezone, exact app ID/configuration reviewed, authorized Page/test setup, tested permissions, endpoint results, real observed field availability, public URLs, deployment commit, and remaining limitations. Never include tokens or passwords in the ledger or repository.

## Manual deletion procedure for the operator

This is an operational obligation, not an automatic service. The account owner must monitor support.

- Receive the request from the registered Signal email. Verify ownership; for ambiguous or lost-email cases, explain the required checks before deleting. Never ask for a platform password or recovery code.
- Confirm whether the request is Facebook-only or full Signal-account deletion. Explain that full deletion also removes drafts and other connected-account data.
- Use the authenticated self-service unlink route for Facebook-only requests when the user can access Signal. For support-handled requests, use a reviewed, narrowly-scoped database operation against the verified user ID and requested platform. Do not select a user solely by an unverified claimed Page name.
- Full Signal account deletion requires deleting the verified User and its cascading relations, plus reviewing email verification/reset artifacts and operational records keyed separately from User. Audit actual storage and provider-backup retention before claiming every copy has been erased. This packet does not provide a new full-account deletion API.
- Check the requested active records are removed and unrelated users' records remain. Reply with the completion scope and any retention limitations. Do not keep unnecessary copies of the deleted social content as proof.
- Handle provider/backup retention and legal retention according to the actual operational policy. Establish a documented response timeframe before promising a deadline publicly.

## Validation versus unresolved evidence

Automated tests can verify local ownership, origin checks, deletion cascades and public pages. They cannot prove Meta approval, current permission grants, a successful real Graph API refresh, suitability of the business documents, inbox monitoring, third-party data-handling compliance, or live production deletion. Those remain human/live review gates.
