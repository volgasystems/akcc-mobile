# Handover for the AKCC website chat

Read-only inspection baseline: volgasystems/auckland-knights-chess-club,
commit 0a95625fd1130a79174e216e137efc87d6c686ff on 26 October 2026.
Source was cloned only for inspection; no website files were changed.

## Verified in current source, not asserted as applied production SQL

- profiles is explicitly for admin/staff; club_memberships has no auth user
  ownership column. Auth signup creates a role=member profile. Do not assume
  existing memberships/admin credentials are mobile member accounts.
- Guardian contact fields exist; verified family/account relationships do not.
- club_settings includes SMTP credentials alongside public settings. The base
  schema includes broad public SELECT policies for settings, registrations and
  tournaments. Production policies and column grants must be independently
  inspected. The mobile app therefore does not query these tables directly.
- Tournament register route validates DOB/phone/gender, consent and policy
  snapshot, checks active membership only for club_calendar, and charges a
  separate tournament fee. General_open avoids club membership checks.
- Existing consent code accepts explicit Yes/No; only Yes requires consent
  identity/role and a parent/guardian for a minor.
- Payment confirmation and full refund logic already exist server-side. Browser
  return does not prove payment. Source public entries require paid+confirmed.
- Bank-transfer migration has unique pending bank-entry indexes and prior-entry
  checks. The card register route creates a new entry and a new checkout session
  without a stable Stripe idempotency key or an equivalent durable uniqueness
  mechanism found in this inspection. Do not claim duplicate-charge prevention
  until concurrency/retry tests prove it in staging.
- Membership renewal uses scoped signed access tokens; those are not general
  account sessions and must not be reinterpreted as account ownership.

## Proposed next integration work

1. Inspect actual production columns, RLS, grants, migrations, Auth triggers and
   test/live payment settings. No production DB connector/credentials were
   available in this run. Prepared SQL presence does not prove application.
2. Agree staff-verified self/guardian ownership. Review the additive proposal in
   sql/PROPOSAL_member_links.sql; do not run base schema/reset scripts.
3. Introduce a small versioned public JSON read endpoint with explicit DTOs:
   published tournaments/news/settings, current policies and photo notice,
   active membership options, public player columns only. No select('*') DTOs.
   Replace the mobile adapter's temporary HTML reads when it is deployed.
4. Add a durable registration idempotency contract and DB uniqueness/locking.
   Reuse an existing safe pending session on retries; refuse a paid duplicate.
   Keep policy snapshots and payment mode/amount/currency checks. Stage test
   concurrent taps, network timeout/retry, existing paid/pending entries,
   webhook replay, authorised manual confirmation and full refunds.
   Do not delete real duplicate records to make a uniqueness index fit.
5. Member account endpoints must validate Supabase bearer tokens on the server,
   confirmed identity and verified links on every private request. No matching
   email lookup as authorization. Never trust app metadata for family links.
6. Keep existing checkout/webhooks and confirmation emails; native registration
   is not enabled until the same validation contract and test mode are proven.

## Current website limitations remain unresolved

Payment-reminder migration/CRON_SECRET activation is unconfirmed. Vercel Node.js
runtime security check is unconfirmed. This work does not complete either one.
The website's 10-minute admin inactivity timeout has not been changed.

## No shared backend changes applied

No migrations, credentials, production records, routes, payment configuration,
email settings or deployments were modified. HPCC was not accessed or modified.
