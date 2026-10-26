# Native features update — 26 October 2026

## Added

- Calendar list with search and All/Club/Open filters; date, year, venue/details
  and event type. The existing public website remains the source of truth.
- Native results with placings, summary/images and configured Vega/broadcast links.
- Native news article reader; only text and the public article image are rendered.
  Original article remains accessible for tables, formatting and inline links.
- Account > Send an enquiry: native form with name, email, mandatory phone,
  subject, message and explicit confirmation before Send.
- Tournament > Report a round absence: native form with tournament prefilled,
  player/guardian details, round/date, reason and explicit confirmation.
  Guardian phone is preserved in additional notes because the existing absence
  endpoint has no separate guardian-phone field.

Submissions reuse existing website /api/contact and /api/absence routes. No
Supabase key, migration or email credential is needed for these forms. They
save through existing server logic; notification success is not guaranteed.
Responses do not echo private records returned by the website. Markup is rejected
because current website email templates interpolate text as HTML.

## Retry and operational limits

In-flight requests and outcomes are keyed by a per-form submission reference
and payload digest. Same-key same-payload retries reuse one upstream request;
changed payload is rejected. Ambiguous upstream errors are retained and users
are told to contact the club rather than send again. The adapter logs no form
payload. A server restart or additional instance loses the in-memory protection;
use a durable shared store, abuse protection and trusted-proxy rate limiting
before production distribution. These forms do not initiate payments.

References identify the current adapter submission, not a searchable website
record ID; keep approximate submission time/name available when contacting staff.

MOBILE_FORMS_ENABLED=false disables the native submit endpoints if needed.
It does not alter the existing website forms or email settings.

## Validation

20 automated tests pass, including Windows startup, phone/date/confirmation
validation, field allowlists, concurrent retry deduplication, ambiguous outcome
handling, rate caps, email-warning handling, draft filtering, result links and
news script filtering. TypeScript strict checks pass. Android/iPhone/web JS
bundles export successfully. No new native dependencies were added.

Live GET-only checks successfully read a published news article. The current
calendar and results pages explicitly contain no published items, and the app
shows that empty state. Populated calendar/results were tested using fixtures.

No live enquiry/absence submission, email, registration, charge, refund or
production account change was made. Physical-device screen/form testing remains
for the user after updating; JS exports are not APK/IPA builds or visual QA.

## Update your Windows test environment

Stop Metro and the API using Ctrl+C in each terminal. In the mobile directory:

```powershell
git pull --ff-only origin main
npm test
npm run typecheck
npm run api
```

In the second terminal:

```powershell
npx expo start --go --clear
```

Keep your existing .env values, including your computer's current LAN IP. Scan
the QR code in Expo Go. Do not send test enquiries or absences to the live club;
review form validation and navigation without pressing Send unless submitting a
real intended enquiry/report.

## Still pending

Verified member-account onboarding/ownership links, full native membership and
tournament registration/payment, password recovery completion, push services,
production hosting/store distribution and the existing dependency audit findings.
Hosted payment forms remain in use. No SQL was applied and neither website nor
HPCC source or deployment was modified.
