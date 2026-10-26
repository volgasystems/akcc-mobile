# Windows API startup fix — 26 October 2026

The entry-point guard previously expected POSIX forward slashes. On Windows,
the script completed without opening the API listener. The guard now compares
file URLs, handling Windows backslashes and spaces in OneDrive paths.

Validation: 11 tests pass, including a simulated Windows OneDrive path, import
without a listener, and a child-process startup/HTTP health check. Actual Windows
device execution still needs confirmation after pulling this change.

Run in PowerShell:

```powershell
git pull --ff-only origin main
npm test
npm run api
```

Expected: `AKCC read API listening on port 8787`. Keep the terminal open.
Open http://localhost:8787/health and expect
`{"ok":true,"accounts_enabled":false}`.
The missing server/.env notice is expected for public read-only mode.

## Dependency audit remains open

The audit reproduced five high-severity package findings through Expo CLI,
node-forge and zod. These include inherited dependency findings, not five
separate root advisories. node-forge 1.4.0 is currently the latest registry
version but is flagged by the advisory. The installed CLI depends on zod 3;
overriding it to zod 4 would be a major compatibility change.

Do not run `npm audit fix --force`: the current audit proposes an incompatible
Expo downgrade to 44.0.6. No audit findings have been suppressed or declared
resolved. Keep this tracked for upstream fixes and a tested dependency update
before release. The startup fix does not change the lockfile.
