# Notifications and release planning

Notifications are designed but not delivered in this version. Do not request
permission during first launch. Add an optional Account > Reminders opt-in only
after the club has configured Expo/EAS project, APNs and FCM credentials and an
authenticated server token-registration endpoint. Keep per-device tokens private,
allow opt-out/revoke, remove invalid tokens, and deduplicate reminder delivery.
Use Pacific/Auckland event times with daylight saving. A background reminder
worker must select only eligible confirmed entries and exclude full refunds/
cancellations. Announcement sending remains a privileged website action.
Never reuse or activate the unconfirmed payment-reminder cron as a push worker.

Before store release: real-device QA, accessibility checks, privacy policy,
support URL, data-handling disclosures, account-deletion workflow if accounts
are offered, review account/test instructions, signed builds, store screenshots,
and clubs' approval of branding. Review Apple/Google rules for the exact services
sold; physical event entry should continue using the existing Stripe flow.

The club needs its own Apple Developer and Google Play Console accounts and
must complete identity/organisation verification and store enrollment. Store
fees and Expo build allowances must be checked at enrollment; none were paid
or accounts created in this work. iPhone internal distribution may require
registered devices and Apple signing. Android internal APK distribution and
Play internal testing are distinct from public publication. No app-store
submission or hosted deployment has been attempted or completed.
