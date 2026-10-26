# Auckland Knights mobile app

Separate Expo/TypeScript project for Android and iPhone. Black, gold and white,
with the existing website PWA logo. No HPCC code. No website writes or deployment.

## What works now

- Native Home, tournament browsing/detail, public player table with alternating
  rows, name/FIDE/NZCF sorting and official FIDE profile links.
- Live public website reads through the included read-only adapter. No demo
  tournament records, private DB reads or credentials are needed for these reads.
- Native calendar and results screens with search, club/open event filters,
  placings and external Vega/broadcast links. Native news article reading.
- Native contact/enquiry and round absence forms. These submit to the existing
  website APIs via the mobile adapter only when a user presses Send. Phone and
  explicit details confirmation are required. Absence reports are not refunds.
- Membership join/renew, registration/payment and AGM continue using the existing
  system-browser website forms. Native payment and account linking remain pending.
- Error/retry, refresh and empty states; Auckland date formatting.
- Account sign-in, secure native session storage, editable account metadata,
  current-password check before password change, global sign-out after change,
  password reset initiation and logout are implemented but configuration-gated.
- Private membership/payment reads require staff-verified ownership links and
  confirmed Supabase identity. These endpoints are not active by default.
- Notification UI explains unavailability and requests no permission.

## Start locally

Use Node 24 LTS and npm. The lockfile pins the tested package set. Expo SDK 58
was selected from the registry and its bundledNativeModules.json supplies the
matching React, React Native and Expo module versions.

```sh
npm ci
npm test
npm run typecheck
npm run api
```

Leave the API running. In another terminal:

```sh
# Windows: copy .env.example .env
# macOS/Linux:
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, e.g.
`http://192.168.1.10:8787`. Phone and computer must be on the same network;
allow the API port through your local firewall only on your private network.
A phone's localhost is the phone, not your computer. HTTP is accepted only
by development bundles. For builds distributed to others, deploy the adapter
with HTTPS and set that URL instead. Do not put server/.env values in app env.

```sh
npx expo start
```

Use an SDK 58-compatible Expo Go if available; otherwise use the development
build below. Expo Go compatibility on a particular physical device was not
verified. Browser preview: `npx expo start --web` after configuring CORS for the
local preview origin (the adapter defaults to no browser CORS).

### Native builds

Android emulator: install Android Studio/SDK and Java per Expo requirements,
then `npm run android`. For an iPhone simulator on macOS, install Xcode and run
`npm run ios`. A development build supports the installed native modules.

For EAS cloud builds, sign in to your own Expo account and run:

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile preview --platform android
```

EAS project identifiers, signing credentials, developer accounts and a hosted
HTTPS API are not provisioned. Review build quotas before using cloud builds.
Set public environment variables in the selected EAS environment. Never upload
Supabase service-role, Stripe secret or SMTP keys as EXPO_PUBLIC variables.

`npx expo export --platform android --platform ios` validates JS bundles; it
DOES NOT create APK/IPA installers or verify device behavior.

## Mobile API adapter

`server/public.mjs` parses only published public markup from fixed AKCC pages.
It never parses embedded Next.js/RSC data or forwards arbitrary URLs. Tournament
candidates must also pass the public detail route, excluding draft events.
Player responses include only public table cells. Disabled player lists cannot
be fetched through this adapter. Short public feed caching limits upstream load.

This temporary adapter avoids website changes and unsafe direct table access.
HTML layouts can change. Before a production mobile release replace its parser
with an explicit versioned public JSON API in a coordinated website change.
It is not a substitute for checking the production database schema and RLS.
Run the adapter on a separate Node service with HTTPS, rate limiting and
monitoring. No credentials are needed for public reads. New POST routes forward
validated enquiries and absence reports to the existing website; that website
continues to save records and handle its notification logic. The mobile adapter
cannot charge cards or create tournament registrations. Tests use mocked writes.
Native forms are enabled by default; set MOBILE_FORMS_ENABLED=false in server/.env
to disable them. Replays share one submission only while the API process retains
its in-memory outcome record (24 hours maximum). Use a durable shared store and
trusted-proxy rate limiting before multi-instance production hosting. Never retry
an uncertain submission automatically or promise email delivery.

`GET /health`, `/v1/feed`, `/v1/tournaments/:slug`,
`/v1/tournaments/:slug/players`, `/v1/account`, `/v1/calendar`, `/v1/results`,
`/v1/news/:slug`. POST `/v1/enquiries`, `/v1/absences`.

## Accounts and SQL

Read docs/BACKEND_HANDOVER.md before enabling anything. The SQL in
sql/PROPOSAL_member_links.sql is a proposal, NOT applied to production. It adds
only a protected link table. It must be reviewed against the current schema.
Existing guardian contact fields do not prove identity or authority. Staff must
verify self/guardian links out of band. Do not bulk-link by matching email.

Only after review/configuration, set server `MOBILE_ACCOUNTS_ENABLED=true`,
`SUPABASE_URL`, and server-only `SUPABASE_SERVICE_ROLE_KEY`; set app
`EXPO_PUBLIC_ACCOUNTS_ENABLED=true`, Supabase URL and anon/publishable key.
Verify Supabase Auth email confirmation, password policy, SMTP, Auth triggers,
RLS and redirects first. Sign-up is intentionally absent until onboarding and
account lifecycle are agreed. Use a dedicated test member account, not an admin.

Password-reset initiation needs a functioning reviewed HTTPS recovery page
allowlisted in Supabase (`EXPO_PUBLIC_PASSWORD_RESET_URL`). That recovery page
is not included in this version. Reset is disabled when it is absent. No
recovery email was sent during testing. Account metadata edits do not change
membership records, payment records or guardian links.

## Validation

See docs/TESTING.md for evidence and device acceptance steps. No real charge,
refund, registration, deletion, absence report or enquiry was submitted.

## GitHub

Source is maintained separately at https://github.com/volgasystems/akcc-mobile.
Do not push mobile changes into the website repository. Update with
`git pull --ff-only origin main`, stop/restart the API, then restart Metro with
`npx expo start --go --clear`. Keep your existing local .env and LAN IP.

See docs/NATIVE_FEATURES_UPDATE.md for the current implementation and limitations.
