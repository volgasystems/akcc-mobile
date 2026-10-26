# Android rendering follow-up — preview v0.2.2

The reported Android LogBox pointed into the inline player table. The latest
source could not reproduce a raw-text child in mocked rendering, so stale error
logs/bundles remain a possibility. The player table is now a separate multiline
component with each value explicitly rendered inside Text. Links exist only for
valid FIDE IDs. String-derived visibility guards are explicitly boolean.

Added rendered-tree tests for Home, Membership, tournament detail and the actual
player table with empty, unrated, rated and zero-rating values. These use mocked
React Native host components; they do not replace real Android/iPhone testing.
All 25 tests and TypeScript pass. Android and iPhone JavaScript export checks
are also part of validation. No database or payment changes are involved.

After pulling, run npm ci (one new development-only test dependency), restart the
API and restart Metro with --go --clear --lan. Fully close Expo Go on Android,
reopen and scan the new QR. Confirm v0.2.2 under the club name before reporting
a fresh LogBox. Do not edit node_modules or suppress native error reporting.

Membership join/renew intentionally continues using the website. Native member
onboarding, verified ownership and payment integration are separate unfinished
features. News working on iPhone confirms that native feature can load there;
it does not verify which bundle is open on Android.
