# Handoff: CI/CD pipeline hardening (2026-10-05)

You are picking up work to stop the Drift Tennis build pipeline from failing
for reasons unrelated to code. Read this first, then `docs/DEPLOYMENT.md` and
the `Jenkinsfile`. Don't paste secrets into files or commits.

## Where things stand

- **Production is healthy.** Jenkins `master` build **#35** deployed and its
  prod smoke tests passed. That was the first green deploy after builds
  #28–#34 failed.
- **`BILLING_BETA=true`** is set in `/srv/drift/prod/.env.production` on the
  box (backup: `.env.production.bak-202610051200`). It is confirmed inside the
  running `api` container, so the app's free-beta subscription screen is live.
- **Android:** `mobile/pubspec.yaml` is `1.0.0+3`. Version code 2 was used by
  internal testing. The closed-testing bundle is
  `~/Desktop/drift-tennis-release-v3.aab`, release-signed, pointing at
  `https://api.driftsports.app`.

## What already broke, and the fix that is merged

| Failure | Cause | Fix (merged to master) |
|---|---|---|
| Builds #28–#31, GitHub CI | Lock files generated on Windows left out Linux-only optional packages, so `npm ci` failed | PR #31: locks regenerated in a Linux `node:24` container |
| GitHub CI backend e2e | The backend job started Postgres but not Redis | PR #31: Redis service added to `.github/workflows/ci.yml` |
| Builds #32, #33 smoke test | The console check used Jenkins credential `drift-basic-auth`, which no longer matches the box's `/etc/nginx/.htpasswd-drift` | PR #32: console checked without a password (public URL must return 401, app must answer on `127.0.0.1:3007` over the deploy SSH key) |
| Build #34 | One-off Docker Hub blob error pulling `redis:7.4-bookworm` | Restarted as #35. A durable fix is in progress (below) |

Note: Club Admin (`admin.driftsports.app`) has **no** basic auth in the current
nginx config. Only `console.` does.

## In progress: branch `ci/pipeline-hardening` (local only, not pushed)

The approved plan has five items. Status:

1. **Protect `master`.** NOT DONE. Approved by the owner. Require the six
   GitHub CI checks (Backend build and tests, Club Admin production build,
   Platform Admin production build, Website lint and production image,
   Flutter analysis and tests, plus CodeRabbit if wanted) and block direct
   pushes. Use `gh api -X PUT repos/lyomu/drift/branches/master/protection`.
   `master` is currently unprotected.
2. **Retry image pulls in Jenkins.** DONE, uncommitted. The `Jenkinsfile` Test
   stage now runs `pull_with_retry` (3 attempts, 15 s apart) for
   `postgres:16-bookworm` and `redis:7.4-bookworm` before `docker run`.
3. **Linux lock-file script.** DONE, uncommitted. `scripts/lockfile.sh <dir>...`
   regenerates `package-lock.json` inside `node:24-bookworm-slim` and verifies
   it with `npm ci --dry-run`. Tested on `backend` (output unchanged, as
   expected). Still to do: mention it in `README.md` under Conventions.
4. **Clear backend lint and typecheck warnings.** NOT STARTED. Jenkins stages
   `Lint/Backend` (`npm run lint`) and `Typecheck` (`npx tsc --noEmit`) end
   UNSTABLE because of errors that predate this work. First **count** them
   and report to the owner before fixing. Caution: backend `npm run lint` is
   `eslint --fix` and rewrites ~24 unrelated files. Run `npx eslint .` without
   `--fix` to count. Once clean, change their `catchError` from
   `stageResult: 'UNSTABLE'` to failing the build.
5. **Production settings check.** NOT STARTED. Make `scripts/deploy.sh` refuse
   to run if a required variable is missing from `.env.production` (at least
   `JWT_SECRET`, `POSTGRES_PASSWORD`, `BILLING_BETA`). List the required
   variables in `docs/DEPLOYMENT.md`'s Environment file section.

Ship items 2, 3 and 5 as one PR. CI must be green before merging.

## For the owner, not the agent

- **Sign Jenkins in to Docker Hub** (a Jenkins credential plus `docker login`
  on the agent). That removes the anonymous pull rate limit behind build #34.
- **Rotate the Jenkins API token** for `nebulaRet` and the password shared in
  chat on 2026-10-05.
- **Optionally fix `drift-basic-auth`** in Jenkins to the console's real login.
  The pipeline no longer depends on it.

## Open question: is `waitlist.driftsports.app` tracked by PostHog?

Probably yes, but not confirmed. `website/components/analytics.tsx` loads
PostHog when `POSTHOG_KEY` is set, it is rendered from
`app/[locale]/layout.tsx` (which wraps the waitlist route), the prod
`.env.production` sets `POSTHOG_KEY`, and the running `drift-website`
container has it. The key does not appear in the raw page HTML, so check the
PostHog live events view filtered on `$host = waitlist.driftsports.app`, or
open the page with DevTools and look for requests to `eu.i.posthog.com`.

## Access

- Jenkins: `https://ci.einsbrand.com/job/einsbrand/job/drift/job/master/`.
  Production deploys pause at **Approval**. The owner approves those.
- Server: `ssh -i ~/.ssh/drift-deploy-key drift-deploy@46.225.106.43`. The
  `drift-deploy` user cannot read `/etc/nginx`. The repo copy of the config is
  `deploy/nginx/driftsports.app.conf`.

## Loose ends from this session

- Local branches `local/prod-test-apk` (throwaway merge used for a test APK)
  and `fix/jenkins-lint-soft-gate` (predates this session) can be deleted.
- The Android emulator display was set to 1080x1920 at density 320 for Play
  tablet screenshots. Reset with `adb shell wm size reset` and
  `adb shell wm density reset`.
- Play Console: the store listing, the dashboard setup checklist, and the
  version 3 bundle upload are with the owner.
