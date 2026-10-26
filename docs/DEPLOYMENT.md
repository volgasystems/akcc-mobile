# Release preparation — not deployed

Start with Android internal APK and iPhone internal/TestFlight testing. Public store publication is blocked until the chosen release scope is complete; membership submission, account onboarding and push remain gated and have not been validated against production. Do not advertise them as available. Native browsing alone is not completion of the requested first release.

## Required operator information

- Existing Expo project UUID and actual project slug from its Settings. The current app slug is akcc-mobile; the existing dashboard project may be auckland-knights. Verify before linking; do not create a duplicate project. Retain bundle/package ID nz.co.aucklandknights.mobile unless store ownership requires a documented change.
- Choose hosting for the separate long-running Node API (for example a container host). Do not deploy the raw node:http server as an unadapted Vercel function. Deploy only this mobile repository; website and HPCC remain separate.
- Apple Developer/App Store Connect and Google Play Console ownership/signing access for store distribution. Enter credentials in Expo/store dashboards, never chat or source.

## Deploy mobile API first

Use npm ci then npm run api on a persistent Node host compatible with the installed dependencies. Host must provide PORT, HTTPS termination, process restarts, trusted-proxy rate limits and monitoring. Check /health, /v1/feed, /v1/calendar, /v1/results and /v1/membership/options over HTTPS. Health alone does not verify upstream functionality. Restrict server-only secrets to host environment. Initially set MOBILE_FORMS_ENABLED=false, MOBILE_ACCOUNTS_ENABLED=false, MOBILE_MEMBERSHIP_WRITES_ENABLED=false, MOBILE_MEMBERSHIP_CARD_ENABLED=false, MOBILE_PUSH_ENABLED=false and MOBILE_PUSH_CREDENTIALS_VERIFIED=false. This disables submissions until approved staging validation. A read-only pilot is distinct from the complete first release.

## Expo configuration

Install/sign in to EAS CLI on the owner's computer:

```powershell
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest init --id YOUR_EXISTING_PROJECT_UUID
```

Review generated changes, actual slug/owner and project ID. In Expo dashboard configure environment variables separately for preview and production:

```
EXPO_PUBLIC_API_URL=https://YOUR_REAL_DEPLOYED_MOBILE_API
EXPO_PUBLIC_EXPO_PROJECT_ID=YOUR_EXISTING_PROJECT_UUID
EXPO_PUBLIC_ACCOUNTS_ENABLED=false
EXPO_PUBLIC_PUSH_ENABLED=false
```

All EXPO_PUBLIC values are visible in the app. Do not put server secrets here. The URLs/UUID above are placeholders, not deployed services. The build config rejects missing settings and local/insecure API URLs for preview/production. It does not verify DNS, API health, signing or service readiness. The local .env Wi-Fi URL must not be included in a release; use the selected EAS environment and confirm resolved configuration. EAS manages build numbers remotely.

## Build and test

```powershell
npm ci
npm run typecheck
npm test
npx expo install --check
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

iOS internal distribution needs Apple signing and registered devices; TestFlight uses the production store build uploaded to App Store Connect. Internal build installation requires no Metro server. Test both phones on cellular with the PC turned off. Verify branding/type scaling, public player privacy, news/calendar/results, offline errors, links and app resume. Test every enabled write only with isolated test records/Stripe test mode and no member messages. Existing dependency audit findings remain unresolved; review before store release, never use npm audit fix --force blindly.

After scope completion and sign-off:

```powershell
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform android --profile production
npx eas-cli@latest submit --platform ios --profile production
```

Submission uploads binaries; it does not imply approval/publication. Select internal testing/TestFlight first and disable automatic public rollout in the store consoles. Signing, builds, uploads and store records have not been created here.

## Full-release blockers

- Membership: inspect actual schema/migrations; durable duplicate-entry/charge protection on new card joins; staging bank/card/renewal, verified webhook/refund/email reconciliation. See MEMBERSHIP_AND_PUSH.md. No live charge/refund/email for testing.
- Accounts: verified identity/ownership and guardian relationships, reviewed RLS, password lifecycle and account deletion workflow before account creation is offered.
- Push: verified account links, reviewed/applied SQL, Expo/FCM/APNs credentials, opt-in test devices, protected hosted scheduler, ticket/receipt verification, token retention and reassignment. First poll must remain a silent baseline.
- Privacy policy/support URL, accurate Apple privacy and Google Data safety disclosures, content rating, store screenshots/descriptions and reviewer instructions. App permissions/data collection must match the enabled build and hosted service.
- Apple/Google organisation verification and current enrollment fees/terms. New Google personal accounts may require 12 opted-in testers for 14 consecutive days before production access. Apple reviews minimum functionality and requires in-app deletion if account creation is supported. No approval is guaranteed.
- Website payment-reminder migration/CRON_SECRET and Vercel runtime security check remain unconfirmed; this release work does not resolve them.

References: https://docs.expo.dev/build/eas-json/ ; https://docs.expo.dev/build/internal-distribution/ ; https://developer.apple.com/app-store/review/guidelines/ ; https://support.google.com/googleplay/android-developer/answer/14151465

## Existing project identified (27 October 2026)

EAS CLI confirmed @aucklandknightss-team/auckland-knights with public UUID cf884347-bb5a-4eb9-971f-198a58048076. app.json now contains that owner, slug and extra.eas.projectId, and app.config.js preserves it without requiring an environment variable. A supplied EXPO_PUBLIC_EXPO_PROJECT_ID must match this UUID. This supersedes the earlier pending project-identity instructions; do not create or initialize another project. Run npx eas-cli@latest project:info after updating to verify authenticated access from the owner's computer. No signed build, credential setup or deployment has been completed by this configuration change.
