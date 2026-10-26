# Native membership and push announcements — preview v0.3.0

## Delivered in source

Membership now opens a native Join/Renew screen on Android and iPhone. The app
reads current fees and terms from the public Join page, with an allowlist of
public membership-option fields. Because keys are not rendered as HTML inputs,
the adapter parses JSON-only public Next.js Flight props from /join WITHOUT a
member_token query, cookies or authentication. It never evaluates JavaScript,
parses a private renewal page or returns arbitrary Flight fields. This explicit
public-options exception does not change public player privacy protections.

The form includes DOB then gender, mandatory phone/address, guardian details
for children, current options and terms acceptance. One player and one option
per join. Server prices are authoritative. There is no website membership-form
redirect. Card payment, once enabled, opens Stripe's secure hosted checkout.
Bank instructions remain native and tentative until an authorised admin verifies
receipt. Returning from checkout never marks a membership paid.

Renewal uses the existing signed 30-minute email link. The user requests it from
inside the native screen and pastes the link into the app. The existing server
verifies its signature/scope and reuses pending renewal checkout logic. Email
alone grants no ownership or private membership access. Automatic native-link
handoff and verified account onboarding are still pending.

## Membership submissions are disabled by default

MOBILE_MEMBERSHIP_WRITES_ENABLED remains false. This run had no production DB
connection or staging Stripe credentials, so migration application and duplicate
protection could not be verified. No membership, email, charge or refund was
created. The native form and current fees can be reviewed without submitting.
Run sql/INSPECT_mobile_schema.sql to inspect actual metadata first. Do not run a
base schema/reset script. Verify bank-transfer migrations and uniqueness, then
exercise mock/test memberships in staging. Only after review should the operator
enable writes. A separate MOBILE_MEMBERSHIP_CARD_ENABLED flag protects new card
joins: the inspected existing route has no durable duplicate-card safeguard.
The mobile adapter's in-memory retry cache is not a substitute for DB-level
idempotency or a durable shared outcome store. Neither switch changes Stripe
mode: never point a test at live payments and assume the switch makes it test.

## Push behavior implemented, not activated

Native announcement settings let a verified registered user opt in to new
Tournaments, News, or both. A credential/configuration/build/eligibility check
happens BEFORE requesting phone permission or obtaining a push token. Remote
push is intentionally unavailable in Expo Go in this implementation. Test with
physical Android/iPhone development builds after configuring FCM/APNs.

Recipients must have a confirmed Supabase email plus a staff-verified active paid
membership link OR a staff-verified confirmed paid tournament-registration link.
Typed email is never used to attach records. Parent/guardian authority must be
verified separately. Signup/verified account onboarding is still not enabled;
Expo login is NOT a club-member login. People must install the app and opt in;
existing web registrants cannot be notified merely because an email is stored.

Proposed SQL adds mobile_registration_links, private device subscriptions,
announcement sources, seed state and a delivery outbox. Tables have RLS and no
anon/authenticated direct grants. Only the server role can manage them. Apply
neither proposal until the actual schema and identity workflow have been reviewed.

The protected poll endpoint checks published public news and open tournament
registration links. Its FIRST successful poll silently seeds current content,
so old items do not trigger a mass message. Later newly seen source keys create
one outbox row per opted-in eligible device. Edits do not re-notify. Eligibility,
revocation, topic preference and disabled state are rechecked before each send.
A conditional claim prevents concurrent workers sending the same pending row.
Unknown send outcomes remain uncertain and are not automatically retried.
Receipts track APNs/FCM handoff (not user viewing); DeviceNotRegistered disables
the token. Public notification data contains only kind, slug and title. Tapping
opens native news or tournament detail. Signing out does not unsubscribe a
device from public announcements; the settings screen explains this behavior.

## Required configuration — not completed

1. Review actual schema with INSPECT_mobile_schema.sql. Agree staff verification
   of self/guardian/player links. Review/apply PROPOSAL_member_links.sql first,
   then PROPOSAL_push_notifications.sql. No email-matching backfill.
2. Configure club member Auth, confirmation and test accounts. Verify existing
   profiles/admin roles/triggers and RLS without changing admin inactivity logic.
3. Supply the existing Expo project's public UUID as EXPO_PROJECT_ID on the
   server and EXPO_PUBLIC_EXPO_PROJECT_ID for the build. app.config.js injects it
   into EAS metadata only when present. No project was created or linked here.
4. Configure FCM v1 for Android, APNs/signing for iPhone and Expo enhanced push
   security. Use your own developer accounts/EAS dashboard; do not paste private
   keys, passwords or access tokens into chat or GitHub.
5. Deploy the mobile server to HTTPS with its server-only Supabase credentials,
   Expo access token and a distinct 32+ character MOBILE_PUSH_CRON_SECRET.
   Keep both push flags false until a test-device validation confirms readiness.
6. Build development clients, not Expo Go: set EXPO_PUBLIC_PUSH_ENABLED=true in
   the selected EAS build environment and run the development build commands.
   Use test accounts linked to test records and opted-in test devices only.
7. After verification set MOBILE_PUSH_ENABLED=true and
   MOBILE_PUSH_CREDENTIALS_VERIFIED=true on the server. Schedule your hosting
   provider's cron to POST /v1/push/poll every five minutes with Authorization:
   Bearer <MOBILE_PUSH_CRON_SECRET>. First poll is a silent baseline.
   The scheduler/hosting has NOT been created. No broadcast was sent.
8. Enable device announcements explicitly. Inspect tickets/receipts using server
   access only. Keep outbox rows to diagnose failures. Do not manually reset
   uncertain/claimed rows to pending without investigating duplicate risk.

Production controls still needed: trusted-proxy rate limiting, monitoring,
retention policy for tokens/outbox, device-account reassignment support and
staging/production data isolation. Notifications do not use or activate the
website's unconfirmed payment-reminder migration/CRON_SECRET.

## Update local preview

Stop API and Expo, pull main, run npm ci, npm test, npm run typecheck. Start
npm run api and npx expo start --go --clear --lan in separate terminals. Confirm
v0.3.0 under the club name. Membership forms work as a read/review preview; write
buttons are disabled until the server readiness switches are deliberately set.
Push settings show configuration/build prerequisites without requesting permission.

## Evidence and limits

Automated tests cover real in-memory Postgres proposal execution, silent baseline,
source/token deduplication, topic consent, unlinked/revoked/expired/refunded
eligibility, public grant restrictions, mock push tickets/receipts, native screen
rendering, membership price allowlists, stale terms, DOB/gender/phone/guardian
validation and default-off submit/delivery behavior. Push sends and membership
writes are mocked. Physical-device push, APNs/FCM setup, production schema and
actual membership payment/recovery have not been tested or activated.

No website source/deployment, HPCC data, production SQL or admin timeout was
modified. Dependency audit findings remain open.
