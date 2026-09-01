# Drift Tennis OWASP Security Review

**Review date:** 2026-08-25  
**Scope:** NestJS API, Club Admin, Platform Admin, Flutter client, Android release signing, and CI controls.  
**Framework:** OWASP Top 10 (2021), with dependency and mobile-signing checks.

## Product-owner decision

**Status: conditional NO-GO for a public production launch.** The baseline HTTP and
credential controls in this work item are complete. The RSS ingestion SSRF path was
hardened in application code on 2026-08-29 (see A10 below); network-egress
restriction for the ingestion worker remains an infrastructure task. Privileged-admin
MFA shipped in the Platform Admin 2FA work (Pending screens Phase 5A). The Android
release key must still be rotated if the existing local keystore has ever been used
for a distributable build.

## Controls completed in this work item

- Helmet is applied to the NestJS application and removes framework disclosure while
  setting standard browser security headers.
- CORS is an explicit origin allowlist. Production startup fails for a missing list,
  wildcard, path-bearing origin, non-HTTP(S) value, or non-HTTPS origin. Cross-origin
  credentials are disabled.
- Production JWT startup fails unless `JWT_SECRET` is external, non-placeholder, and
  at least 32 characters. The example environment file documents the required values.
- Android release signing reads an ignored `key.properties` file or CI environment
  variables. A release task fails closed when the four signing values are incomplete.
- One-time codes now use `crypto.randomInt`; code logging is limited to development.
- Automated tests cover HTTP headers, allowed and rejected origins, environment
  validation, and signing-independent debug configuration.

## OWASP Top 10 assessment

| Category | Status | Evidence and remaining work |
| --- | --- | --- |
| A01 Broken Access Control | Partially controlled | Nest guards and role/scope checks cover protected player, club, and platform routes, and backend E2E tests exercise authorization. Perform an endpoint-by-endpoint authorization matrix before launch and add negative tests for every privileged mutation. |
| A02 Cryptographic Failures | Partially controlled | Passwords use bcrypt; refresh tokens are random and stored as hashes; OTP generation and production logging are now safe; JWT and Android signing values are external. Rotate the Android key if the former hard-coded password protected a real release key, store production secrets in the deployment secret manager, and enforce HTTPS at the load balancer/API gateway. |
| A03 Injection | Controlled with follow-up | DTO validation uses a global whitelist/transform pipe and persistence uses Prisma; no raw SQL or `dangerouslySetInnerHTML` use was found. Continue property-level DTO validation and add payload/fuzz tests for complex endpoints. |
| A04 Insecure Design | Partially controlled | Auth throttles, verification attempt caps, token rotation, suspension checks, and match/competition state rules exist. Complete the minors/guardian-consent policy, account deletion/data-retention workflow, and abuse-case review. |
| A05 Security Misconfiguration | Improved | Helmet and fail-closed production CORS are now centralized and tested. Configure equivalent CSP/security headers on both deployed admin sites, disable source maps unless operationally required, and confirm proxy/TLS settings per environment. |
| A06 Vulnerable and Outdated Components | Exception open | Club Admin and Platform Admin production audits report zero vulnerabilities. Backend audit reports three high findings through Prisma 7.9.1 -> `@prisma/config` -> `deepmerge-ts` 7.1.5 (GHSA-ggr8-5vv4-36mx). The current stable Prisma release has no patched dependency; do not use `npm audit fix --force`, which proposes a breaking downgrade. Track Prisma's stable fix and upgrade immediately when available. The known vulnerable merge path is configuration tooling and no attacker-controlled recursive-object path was identified in the running API. |
| A07 Identification and Authentication Failures | Partially controlled | Access/refresh token separation, hashed refresh tokens, rotation/revocation, rate limiting, and current-user status checks are present. Mandatory MFA for Platform Admin is now in place (single-use 2FA challenge before the staff JWT). Still open: strengthen the minimum password policy beyond eight characters and add breached-password screening or equivalent controls. |
| A08 Software and Data Integrity Failures | Partially controlled | Lockfiles and CI build/test gates exist; Android signing no longer embeds credentials. Pin CI actions to immutable commit SHAs and add artifact provenance/signing plus dependency update automation. |
| A09 Security Logging and Monitoring Failures | Partially controlled | Platform administration has audit events and OTP values no longer log in production. Centralize structured security logs, redact tokens and personal data, alert on auth/OTP abuse and admin changes, define retention, and resolve the backend E2E open-handle warning. |
| A10 Server-Side Request Forgery | Mitigated in code; egress control outstanding | `NewsIngestionService` no longer calls `rss-parser.parseURL`. Feed bodies are fetched through `src/news/feed-fetch.ts`, which requires HTTPS (an `http:` escape hatch is non-production only), enforces the optional `NEWS_FEED_ALLOWED_HOSTS` allowlist, resolves every A/AAAA record and rejects private/loopback/link-local/CGNAT ranges (IPv4 and IPv6, including IPv4-mapped), pins the socket to the vetted address via the `lookup` hook (no DNS-rebinding window), follows redirects manually with a cap and re-validates every hop, and bounds response size (2 MB) and time (10 s). The Platform Admin news-source create/update path rejects a disallowed `feedUrl` at write time. Covered by `feed-fetch.spec.ts` (private IPs, allowlist, redirect revalidation, oversized response, timeout, non-2xx) and a `platform-admin.e2e-spec.ts` case. **Remaining:** restrict the ingestion worker's outbound network egress at the infrastructure layer as defence in depth. |

## Prioritized release actions

1. ~~**P0:** Harden RSS fetching against SSRF and add tests for private IPs, DNS
   rebinding, redirects, timeouts, and oversized responses.~~ **Done 2026-08-29**
   (`src/news/feed-fetch.ts`, `feed-fetch.spec.ts`). Infra follow-up: restrict the
   ingestion worker's network egress.
2. ~~**P0:** Add and enforce MFA for Platform Admin accounts.~~ **Done** — Platform
   Admin login issues a single-use 2FA challenge before the staff JWT (Pending
   screens Phase 5A).
3. **P0:** Rotate the Android release key when applicable; store signing material and
   JWT secrets in the CI/hosting secret manager, never in repository variables or
   build logs.
4. **P1:** Add authorization-denial tests for every privileged endpoint and central
   security monitoring/alerts.
5. **P1:** Upgrade Prisma as soon as a stable release pulls `deepmerge-ts >= 8.0.0`;
   keep the advisory as a time-boxed exception until then.
6. **P1:** Apply CSP and deployment headers to both admin sites and pin CI actions by
   commit SHA.

## Verification record

| Gate | Result on 2026-08-25 |
| --- | --- |
| Backend TypeScript build | Passed |
| Backend unit tests | Passed: 419 tests across 34 suites |
| Backend E2E tests | Passed: 86 tests across 16 suites; existing forced-exit/open-handle warning remains |
| Club Admin and Platform Admin production builds | Passed in the CI-gate work item immediately preceding this review |
| Flutter analysis and tests | Passed in the CI-gate work item immediately preceding this review: 554 tests |
| Android Gradle configuration | Passed for normal tasks; an unsigned `assembleRelease` was correctly rejected before compilation |
| Production npm audit | Admin sites: zero findings. Backend: three high transitive findings covered by the A06 exception above |

The review should be considered current only while these gates continue to pass.

References: [OWASP Top 10](https://owasp.org/www-project-top-ten/),
[GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).
