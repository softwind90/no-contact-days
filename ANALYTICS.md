# Analytics setup

GA4 measurement ID: `G-6865L9VTW2`.

Enhanced Measurement was disabled in the matching web stream on October 22, 2026. Standard page views remain enabled. Re-check this setting if the stream configuration changes.

## Validation status (October 22, 2026)

- Five Node tests pass (`node --test tests/analytics.test.cjs`): opt-in gating, URL/property filtering, withdrawal without reloading unsaved inputs, unavailable storage/preview exclusion, and cross-tab withdrawal.
- Local Chrome check: declining still allows tracker creation; preferences reopen and accept; localhost loads no Google tag.
- JavaScript syntax, sitemap XML, Vercel JSON, and whitespace checks pass.
- Not yet deployed or verified in GA4 Realtime. The GitHub connector denied repository writes (403); a native Git push dry-run failed during the HTTPS connection. These are publishing blockers, not evidence of GA4 collection.

## Events

Allowed names: `tracker_created`, `daily_checkin_saved`, `no_contact_days_calculated`, `mini_no_contact_calculated`, `mini_breakup_days_calculated`, `milestone_card_downloaded`, and `free_tracker_link_copied`. No caller properties are forwarded. Repeated check-in saves are events, not necessarily distinct user-days; count distinct users/dates when analyzing frequency.

The implementation replaces the old local analytics event logger; it does not delete tracker data or an existing legacy local event history. Referrers are reduced to their origin. URL sanitization also removes campaign parameters, so campaign attribution is deliberately limited in this first version.

Withdrawal uses Google's documented [analytics opt-out flag](https://developers.google.com/tag-platform/security/guides/privacy#turn_off_google_analytics) and clears GA cookies without reloading the page or discarding unsaved inputs.

## Release checklist

- Load GA4 only after an explicit analytics opt-in. Declining must not limit any tool.
- Provide a persistent footer control to change the choice and withdraw consent.
- Send page addresses without query strings or fragments. The site uses a last-contact date in a URL parameter; never report it.
- Disable Enhanced Measurement in the GA4 web stream before release. Use the site's explicit page views and allowlisted events instead, so automatic form, search, and outbound-link events do not bypass data minimization.
- Send only allowlisted event names, without caller-supplied parameters. Never send names, dates, emotional scores, notes, letters, or vault contents.
- Keep advertising consent denied and disable Google Signals and advertising personalization in the tag configuration.
- Restrict collection to the production domains, excluding localhost and preview deployments.
- Verify both consent choices, withdrawal, blocked browser storage, and one page view per load. Confirm events in GA4 Realtime after production deployment.

## Interpretation

Collection starts only after deployment and consent; it cannot reconstruct earlier return visits. Returning users represent recognizable consenting browsers, not necessarily distinct people. Cookie deletion, private browsing, multiple devices, blockers, and consent selection affect results. Do not infer SEO or product improvement from small samples or an incomplete observation window.

Record the deployment timestamp, property time zone, reporting date range, and test traffic when starting the baseline. Distinguish returning users from cohort retention: a return at any later time is different from returning on a specific day after first use.
