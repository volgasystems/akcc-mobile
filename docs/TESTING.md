Latest update: see [NATIVE_FEATURES_UPDATE.md](NATIVE_FEATURES_UPDATE.md) for 20 passing tests and native form validation. The table below records the initial baseline.

# Validation and remaining device checks

Validation performed 26 October 2026.

| Check | Result |
|---|---|
| TypeScript strict check | Passed |
| Parser/privacy/account authorization tests | 8 passed |
| Web JavaScript export | Passed |
| Android and iPhone Hermes JavaScript exports | Passed |
| Expo module compatibility against installed manifest, offline check | Passed; offline check reports limited reliability |
| Live read adapter | 1 tournament, 3 news posts, 52 public player rows at test time |
| Public player DTO scan | No DOB, email, phone, consent or payment identifier keys |
| Live tournament detail | AKCC1 date, venue/address, $20, 15+5, 7 rounds and FIDE/NZCF rating read successfully |
| Browser visual QA | Blocked: browser executable absent and browser download returned invalid/truncated archives |
| APK/IPA generation and installation | Not run; no signing/build account configured |
| Production Supabase schema/applied migrations | Not verified; no DB connection configured |
| Account sign-in/profile/password/logout end to end | Not run; account feature gated |
| Registration, Stripe charges/refunds and webhook end to end | Not run; no test backend/payment configuration |
| Notification permissions and delivery | Not implemented; no permission requested |

Live reads used GET only. No real registration, charge, refund, deletion,
enquiry, absence report or test email was submitted. Public player counts are
time-specific. Bundles establish buildability, not device/store readiness.

## Device acceptance before distributing

1. Test Android and iPhone safe areas, small screens, large text, accessibility,
   keyboard, scrolling, links and back navigation.
2. Pull to refresh; disconnect/reconnect; confirm retry and empty states.
3. Check fees, venue/address, NZCF notice. General registration must not show
   club-join requirements. Club events require active club membership.
4. Scroll all eight public player columns, sort by all three options and follow
   valid FIDE profiles. Inspect DTOs for private fields.
5. On an isolated staging backend verify DOB then gender ordering, required
   phone, explicit photography Yes/No, guardian rules and accepted policy
   snapshot/version changes. No consent must still allow entry.
6. Use Stripe TEST mode only. Verify pending stays private, webhook replay,
   authorised manual confirmation, concurrent submission/retry deduplication
   and full refund removal. Do not test by submitting production forms.
7. After account configuration test self/guardian links, revocation, unrelated
   users and no cross-account access. Verify profile, password recovery,
   wrong-current-password rejection, password change and logout on devices.
8. No push prompt until notification credentials and consent UI are configured.
