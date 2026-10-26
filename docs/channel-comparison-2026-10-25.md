# Channel comparison, 25 October 2026

Dashboard adds 7/30/90-day follower comparison cards using the existing owner-scoped snapshot query, with no extra provider or AI requests. Each card reports first/last observed UTC timestamps, saved observation count, absolute change, percentage where the baseline is positive, and a warning when the last observation is over 24 hours old. Overview's 90-observation cap is disclosed per affected account.

These are observed-date changes within a rolling window, not interpolated full-window growth. Missing endpoints, a single point and equal timestamps do not produce growth. Zero baselines have no percentage. Cards do not rank channels with unequal coverage or mix post metrics across platform definitions. Guidance suggests investigation, not causal attribution.

Validation: 129 automated tests pass; lint and TypeScript pass. On 26 October, the production Webpack build passed. The local default Turbopack build reported a persistence-cache parsing error; hosted deployment verification is separate. Browser and physical-device interaction are not yet independently verified for this addition. Provider authorization remains separate from configured callback URLs.
