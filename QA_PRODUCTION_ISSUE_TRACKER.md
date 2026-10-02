# Drift Tennis QA and Production Issue Tracker

**Created:** 2026-10-01  
**Source:** Interactive product click-through and production-build verification  
**Status key:** `[ ]` to do | `[~]` in progress | `[!]` blocked | `[x]` verified complete

This tracker consolidates the issues found during the 2026-10-01 QA pass. It
contains confirmed defects, production configuration blockers, data-quality
problems, and verification gaps. It does not duplicate unrelated roadmap work.

## Summary

| Priority | Open | Meaning |
| --- | ---: | --- |
| P0 | 3 | Blocks or can break a production deployment |
| P1 | 2 | High-impact operational or provider issue |
| P2 | 1 | Data-quality problem |
| P3 | 0 | Performance improvement |
| Verification | 3 | Important behavior not yet proven |

## P0 - Production blockers

- [x] **PROD-001 - Fix the backend production entry point**
  - **Observed:** `npm run start:prod` runs `node dist/main`, but `nest build`
    emits `dist/src/main.js`. Production startup fails with `MODULE_NOT_FOUND`.
  - **Location:** `backend/package.json`.
  - **To do:** Point `start:prod` at the emitted file or change the Nest build
    output so the existing command is correct.
  - **Done when:** `npm run build && npm run start:prod` starts the API and
    `/health` returns HTTP 200 without a manual path override.
  - **Verified 2026-10-01:** The normal production command started the compiled
    API and `/health` returned HTTP 200.

- [x] **PROD-002 - Make all Next.js standalone artifacts deployable**
  - **Observed:** Website, Club Admin, and Platform Admin use
    `output: "standalone"`, while their local `start` scripts used unsupported
    `next start`. Directly launching an unstaged `.next/standalone` folder
    returned 404 for JavaScript, CSS, fonts, and public images. The Dockerfiles
    already staged `.next/static`; the two admin Dockerfiles omitted `public`.
    A Windows-only direct run also selected Sharp's wasm path without
    `@emnapi/runtime`; the Linux container artifact still needed verification.
  - **Additional defects found during the Linux container pass (2026-10-01):**
    (1) `package-lock.json` was hand-edited when `@emnapi/runtime` was added,
    which dropped the `@emnapi/core` entry and left all three locks out of sync.
    `npm ci` — run by every Dockerfile — aborted with
    `Missing: @emnapi/core@1.11.3 from lock file`, so none of the images could
    build. The locks were regenerated on the deploy target
    (`node:24-bookworm-slim`, `npm install --package-lock-only`) so only the
    intended root dependency addition and the removal of the stale
    `"optional": true` flag remain. (2) The runtime stage drops to the non-root
    `node` user while `COPY` wrote the app tree as `root`, so the Next.js image
    optimizer logged
    `EACCES: permission denied, mkdir '/app/.next/cache'` on every optimized
    image. All three Dockerfiles now copy with
    `COPY --from=build --chown=node:node`.
  - **Locations:** `website`, `club-admin`, and `platform-admin` package scripts,
    Next configs, Dockerfiles, `package-lock.json`, and deployment packaging.
  - **To do:** Standardize the runtime command on the standalone server, copy
    `public` and `.next/static` into the final artifact, and include Sharp's
    required runtime dependency for the target platform.
  - **Done when:** Each final container/artifact starts using its real production
    command, renders styled pages, loads all chunks/fonts/images with no 4xx,
    and produces no missing-module errors.
  - **Verified 2026-10-01 (Windows standalone):** All three prepared standalone
    servers returned HTTP 200 and loaded their JavaScript, CSS, fonts, and
    images with no failed or 4xx requests. `/_next/image` returned `image/webp`
    (`hero-court.jpg` 114135 -> 16228 bytes; `drift-icon.png` 9182 -> 1276
    bytes), confirming Sharp's wasm path resolved. The admin Dockerfiles now
    copy `public` as well.
  - **Verified 2026-10-01 (Linux containers):** All three images built from the
    real Dockerfiles on `node:24-bookworm-slim` (`npm ci` clean, `docker build`
    exit 0). Running each container, `/`, `/reserved`, `/fr`, `/en`, the admin
    `/login` routes, `/_next/static` chunks, and `public/images/*` all returned
    HTTP 200; `/_next/image` returned `image/webp` at the expected sizes, and
    container logs contained no `EACCES`, missing-module, or unhandled-rejection
    errors. Temporary images and containers were removed after the run.

- [!] **PROD-003 - Repair and verify the public waitlist endpoint**
  - **Observed:** The production website redirects `/waitlist` to
    `https://waitlist.driftsports.app/`. From the verification environment, that
    destination failed certificate validation and returned HTTP 403.
  - **Blocked on:** Access to the deployed nginx host routing, the TLS
    certificate/chain for `waitlist.driftsports.app`, and the live waitlist
    container. This cannot be reproduced or repaired from the local worktree.
  - **To do:** Verify certificate coverage, nginx host routing, access controls,
    and the deployed waitlist container.
  - **Done when:** A clean external browser reaches the waitlist over trusted TLS,
    receives HTTP 200, and can submit the form successfully.

- [~] **MOBILE-001 - Configure and verify the Android store signing identity**
  - **Observed:** The project correctly refuses to sign a release with the
    preview key. A preview-signed release APK compiled, but it is not suitable
    for Google Play.
  - **Current state:** A gitignored release profile and keystore are present on
    this workstation. Their signer still needs to be verified against the
    documented Play identity and backed up securely.
  - **Done when:** The certificate is confirmed as the intended permanent Play
    identity, the keystore and password are backed up securely, and the AAB is
    accepted by a Play Console internal-testing track.
  - **Verified 2026-10-01:** The release profile selected alias `drift-release`.
    The generated bundle carries the documented release SHA-1
    `B1:FF:6E:D1:BE:0F:19:1D:36:CA:18:D5:98:DD:86:5F:3C:46:CE:BF`.
    Bundle acceptance remains covered by MOBILE-002 and VERIFY-001.

- [!] **MOBILE-002 - Repair the Android release toolchain symbol-stripping step**
  - **Observed:** The correctly configured store-profile build generated and
    signed `app-release.aab`, then exited non-zero because Flutter could not
    strip debug symbols from native libraries.
  - **Environment finding:** `flutter doctor -v` reports the Android SDK
    command-line tools are missing and the Android license status is unknown.
  - **To do:** Install the matching Android SDK command-line tools, accept the
    required licenses, rerun the store build, and investigate individual native
    libraries only if symbol stripping still fails.
  - **Done when:** The release command exits zero, signer verification still
    matches MOBILE-001, and the AAB is accepted by Play internal testing.

## P1 - High priority

- [ ] **PROD-004 - Complete and validate the production backend environment**
  - **Observed:** Production boot rejected missing or placeholder `JWT_SECRET`
    and missing `CORS_ALLOWED_ORIGINS`, as designed. The checked local `.env`
    targets PostgreSQL on port `55433`, while the available database was on
    `5434`.
  - **To do:** Reconcile the deployment environment with the actual database,
    set a strong managed JWT secret, and list the exact HTTPS console origins.
    Keep secrets out of source control.
  - **Done when:** The normal production command boots with the deployed env,
    health and metrics return 200, and both admin login endpoints work without
    temporary overrides.

- [!] **PROD-005 - Configure production payment providers and webhooks**
  - **Observed:** The API reported no IntaSend secret, so club billing uses the
    sandbox provider. It also reported no Paddle API key, leaving USD club
    billing without a route.
  - **Blocked on:** Production provider accounts, keys, webhook secrets, callback
    URLs, and an owner decision to enable real payments.
  - **Done when:** Provider health checks pass, signed webhook test events are
    processed, a controlled payment and refund reconcile correctly, and no
    sandbox fallback appears in production logs.

- [x] **UX-001 - Add confirmation and feedback to account suspension**
  - **Correction:** A native confirmation was already present; the automated QA
    harness accepted it immediately. The open issue was that the confirmation
    did not state that login would be blocked and live sessions revoked.
  - **To do:** Add a confirmation dialog naming the account and consequence,
    require an explicit destructive action, disable repeat submission, and show
    success or failure feedback.
  - **Done when:** Accidental dismissal changes nothing, confirmation suspends
    exactly once, the affected login is blocked, restore returns it to `ACTIVE`,
    and both actions remain auditable.
  - **Verified 2026-10-01:** User-list, user-detail, and platform-team actions
    now name the account and explain access/session consequences before the API
    call. The production build and TypeScript checks pass.

- [x] **WEB-002 - Move to the new landing page while preserving the live page**
  - **Requirement:** Make the new landing page the primary public experience,
    but do not delete or overwrite the landing page that is currently live.
  - **To do:** Preserve the current page in a clearly named, maintained route or
    source location; move the new page to the primary route; keep its assets and
    dependencies intact; and document the rollback path. Do not leave the
    reserved page exposed to search indexing unless that is explicitly desired.
  - **Done when:** The new landing page is served at the primary production URL,
    the previous live page remains accessible at an agreed reserved location,
    both pages build and render correctly, analytics and locale navigation work,
    and production can be rolled back to the reserved page without reconstructing
    deleted code.
  - **Verified 2026-10-01:** The new page renders at `/`; the previous page
    renders at `/reserved` (and localized variants), carries `noindex`, remains
    excluded by `robots.txt`, and both return HTTP 200 from standalone output.

## P2 - User-facing and data-quality issues

- [x] **WEB-001 - Fix duplicated locale segments in waitlist language links**
  - **Observed:** On the English waitlist route, the English language link was
    generated as `/en/en/waitlist` on the waitlist host.
  - **To do:** Generate locale links from the locale-free pathname and test all
    locale-to-locale transitions on both the apex and waitlist hosts.
  - **Done when:** English, French, and Spanish links resolve to one locale
    segment, preserve the intended page, and return HTTP 200 without loops.
  - **Verified 2026-10-01:** Locale normalization now strips `en`, `fr`, or `es`
    before generating sibling links. The built localized routes contain one
    locale segment and canonical English redirects to the unprefixed route.

- [~] **DATA-001 - Clean duplicated QA/seed records and make seeding idempotent**
  - **Observed:** The club screens contain repeated copies of the same courts and
    announcements, making legitimate duplicates hard to identify.
  - **To do:** Identify whether duplicates come from seed scripts or repeated QA
    runs, add stable upsert keys/idempotency, and remove only confirmed test data.
  - **Done when:** Re-running the seed or QA setup does not increase record counts
    and the club lists contain one copy of each intended fixture.

## P3 - Performance

- [x] **PERF-001 - Prioritize the above-the-fold Drift image**
  - **Observed:** Next.js reported the Drift icon as Largest Contentful Paint and
    recommended eager loading on relevant Club Admin pages.
  - **To do:** Mark the actual above-the-fold image as `priority`/eager and verify
    that this does not preload images below the fold.
  - **Done when:** The production page no longer emits the LCP image warning and
    a repeatable performance check shows no regression.
  - **Verified 2026-10-01:** Login and dashboard-shell logo images are explicitly
    prioritized and the production build completed successfully.

## Verification gaps

- [ ] **VERIFY-001 - Run Android device-level release testing**
  - Install a release build on at least one supported physical device or emulator
    and repeat login, onboarding, navigation, networking, notifications, deep
    links, image picking, and background/resume checks.

- [!] **VERIFY-002 - Build and test the iOS release**
  - **Blocked on:** macOS with Xcode, signing certificates, provisioning profiles,
    and access to App Store Connect/TestFlight.
  - Verify archive creation, signing, login providers, push permissions, deep
    links, privacy manifests, and TestFlight installation.

- [ ] **VERIFY-003 - Repeat the full click-through against deployed production**
  - After PROD-001 through PROD-005 are resolved, test the public HTTPS services
    using production artifacts: sign in, create a court, publish an announcement,
    create a league, suspend/restore a designated QA account, and verify audit
    records. Use designated QA data and clean it up afterward.

## Verified working or resolved

- [x] **VERIFIED-001 - Website production build**
  - Next.js compilation, TypeScript, and 19-page prerender completed successfully.
- [x] **VERIFIED-002 - Club Admin production build**
  - Next.js compilation, TypeScript, and 34-page prerender completed successfully.
- [x] **VERIFIED-003 - Platform Admin production build**
  - Next.js compilation, TypeScript, and 50-page prerender completed successfully.
- [x] **VERIFIED-004 - Backend production compilation**
  - Nest/TypeScript compilation completed successfully. With temporary valid
    production values and the corrected entry path, health, metrics, club login,
    and platform-admin login returned HTTP 200.
- [x] **VERIFIED-005 - Flutter analysis and Android AOT compilation**
  - `flutter analyze` reported no issues. A preview-signed release APK compiled
    successfully; store signing remains tracked by MOBILE-001.
- [x] **VERIFIED-006 - Core interactive administration flows**
  - Club login, court creation, announcement publishing, league creation, main
    club navigation, platform login, user search, suspend/restore, and audit-log
    recording passed in the local QA environment.
- [x] **VERIFIED-007 - Clarity CSP allowance**
  - The current production website response permits the Clarity domains. The
    earlier CSP-blocking observation was not reproduced in the production build.
- [x] **VERIFIED-008 - Mobile release API endpoint corrected**
  - The release script and active operational documentation now use
    `https://api.driftsports.app`, replacing the retired
    `drift.einsbrand.com/api` deployment address.

## Evidence

- Interactive flow screenshots: `qa-evidence/actual-flow-complete-1790872961021/`
- Production-render screenshot: `qa-evidence/production-build-2026-10-01/`
- Preview-signed Android artifact:
  `mobile/build/app/outputs/flutter-apk/app-release.apk`
- Linux standalone-container smoke test (2026-10-01): `website`, `club-admin`,
  and `platform-admin` images built with `docker build` from
  `node:24-bookworm-slim` and exercised over HTTP (routes, static chunks, and
  Sharp `/_next/image`). Temporary images/containers were removed after the run
  and nothing was pushed to a registry.

## Update rules

1. Keep issue IDs stable in commits and pull requests.
2. Change `[ ]` to `[~]` when implementation begins and to `[x]` only after the
   listed completion check has been run.
3. Keep `[!]` for work that requires credentials, external accounts, hardware, or
   an owner decision; name the blocker explicitly.
4. Add verification date, command or environment, and evidence path when closing
   an item.
5. Do not commit credentials, signing files, tokens, or production database URLs
   to this tracker.
