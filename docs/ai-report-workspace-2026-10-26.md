# AI report resilience and export

The last successful AI report stays visible and downloadable while a replacement is generated. If regeneration fails, its original contents and received timestamp remain intact, with the failure shown separately. A newly validated success replaces both atomically. Repeated generation clicks are guarded while a request is in flight.

Copy report and Download report (.txt) include summary, observations, opportunities, actions, platform notes, account scope, requested sample and the received timestamp in UTC. The export labels AI analysis and distinguishes receipt time from measurement time. Filenames include a timestamp and unique suffix. Copy failure suggests download and vice versa.

This is in-page retention, not server report history. Navigation, reload, or account/sample changes clear the report; the page explicitly tells users to download before leaving. No automatic provider call, additional storage, permission change or database migration is introduced.

Regression tests cover retention during loading/failure, atomic replacement on success, export completeness and malformed response rejection. Live AI-provider success and browser clipboard availability are separate from these deterministic checks.
