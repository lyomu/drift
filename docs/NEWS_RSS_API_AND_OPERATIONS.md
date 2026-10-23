# Tennis News API and operations

This page describes the implemented rights-gated slice. Keep all real publisher sources paused until a named reviewer has verified written permission or a licence for Drift's intended commercial use. A feed returning HTTP 200 is not permission.

## Deployment order

1. Back up PostgreSQL and review the six News migrations in order: `20261022120000_news_rights_gate`, `20261022150000_news_admin_mobile_categories`, `20261022180000_news_ai_automation`, `20261022210000_news_ingestion_reliability`, `20261022220000_news_operations_settings`, and `20261022230000_news_original_headline`. They add rights and moderation, managed categories, optional AI, feed validators/diagnostics, operational settings, and the unedited feed headline for review. The fourth migration archives the five fictional seed stories while retaining saved-story rows.
2. With `DATABASE_URL` configured, run `npx prisma migrate deploy` and `npx prisma generate` from `backend/`. Deploy the API and admin together. The current database seed no longer creates fictional news stories. Do not run the general demo seed against production because it changes unrelated demo data.
3. Configure `NEWS_FEED_ALLOWED_HOSTS` to the exact feed hosts authorized for this environment. Keep `NEWS_FEED_ALLOW_INSECURE` unset in production. Set egress firewall rules to disallow private, loopback, link-local, and metadata ranges independently of application checks.
4. In Platform Admin, create each source in the paused state. Use **Test connection** from the deployed network. Enter a permission reference, attribution, allowed uses, reviewer, and expiry (if applicable). Only then activate a source. New stories enter the review queue as pending; an authorized editor must approve them individually.
5. Deploy the mobile client after the compatible API. Confirm `DRIFT_API_BASE_URL` points to that API. Test an approved story's original HTTPS publisher link on both supported mobile platforms.

All six News migrations have been applied to local PostgreSQL on localhost:5434. Rehearse deployment and rollback on a staging database copy before production deployment. Rollback means redeploying the prior application version with ingestion paused; preserve the additive database schema and saved references.

## Current API contract

All public News routes require player authentication. `GET /news?take=20&category=PLAYERS&cursor=...` returns `{ total, stories, nextCursor }`. `nextCursor` is an opaque stable `(publicationDate, id)` cursor. Existing `skip` is retained for older clients; a request cannot use `skip` and `cursor` together. `GET /news/categories` returns enabled `{ slug, label }` options in admin order. `GET /news/:id`, `GET /news/saved`, `POST /news/:id/save`, and `DELETE /news/:id/save` retain their existing shapes. Every read filters by explicit publication date, active source, and current approved rights. Publisher images are omitted when image reuse is not approved.

The Platform Admin API is under `/platform-admin` and uses its existing authentication/permission guard:

| Endpoint | Purpose | Permission |
| --- | --- | --- |
| `GET /news/overview` | Counts and recent runs | `CONTENT_MANAGE` |
| `GET/POST /news/sources`, `PATCH /news/sources/:id` | Source list and edits | `CONTENT_MANAGE` |
| `GET /news/sources/:id/rights` | Current permission record | `CONTENT_MANAGE` |
| `PATCH /news/sources/:id/rights` | Approve, restrict, or revoke uses | `CONTENT_MANAGE` and `PLATFORM_CONFIG_MANAGE` |
| `POST /news/sources/:id/test` | Safe, rate-limited fetch without import | `CONTENT_MANAGE` |
| `POST /news/sources/:id/sync` | Rate-limited, cooldown-aware import | `CONTENT_MANAGE` and `PLATFORM_CONFIG_MANAGE` |
| `GET /news/ingestion-runs?sourceId=...&skip=...` | Paged run history | `CONTENT_MANAGE` |
| `GET /news/stories?moderation=PENDING&sourceId=...&category=...&search=...&skip=...` | Paged review queue | `CONTENT_MANAGE` |
| `PATCH /news/stories/:id` | Edit pending preview with version and reason | `CONTENT_MANAGE` |
| `PATCH /news/stories/:id/moderation` | Publish, reject, unpublish, archive, or restore with reason | `CONTENT_MANAGE` |
| `GET /news/categories`, `POST /news/categories`, `PATCH /news/categories/:slug` | List and configure category slugs, labels, visibility, order | Read: `CONTENT_MANAGE`; write: `CONTENT_MANAGE` and `PLATFORM_CONFIG_MANAGE` |
| `GET/PATCH /news/settings` | Ingestion pause, AI assistance, daily limit, summary limit, global automation, retry base and run retention | Read: `CONTENT_MANAGE`; write: `CONTENT_MANAGE` and `PLATFORM_CONFIG_MANAGE` |
| `GET /news/audit?skip=...` | Paged News audit history | `AUDIT_READ` |
| `GET /news/automation-events?skip=...` | Paged automatic publication events | `AUDIT_READ` |

Source creation, editing, activation, and manual sync require both `CONTENT_MANAGE` and `PLATFORM_CONFIG_MANAGE`; editors with only `CONTENT_MANAGE` can review stories. AI and automatic publication are implemented but default disabled. Editors cannot approve rights or change global automation; a database-backed role test verifies this.

## Optional AI provider and automation

The provider boundary is `NewsAiProvider`; the configured implementation is selected with `NEWS_AI_PROVIDER=disabled` (default) or `NEWS_AI_PROVIDER=openai`. OpenAI requires a server side `OPENAI_API_KEY`; `NEWS_AI_MODEL` defaults to `gpt-4o-mini`. The API key is never sent to mobile or admin. Requests use the Responses API with Structured Outputs, `store: false`, no tools, a 15 second timeout, one retry for transient failures, and bounded headline/excerpt inputs. Only rights-cleared sources with `aiProcessingAllowed` can send source text to the provider. A database counter enforces the configured daily request limit across API replicas. Provider failures leave imported stories pending and appear as safe codes and counts in News runs.

AI suggestions are stored separately from the licensed preview. An editor can inspect the summary, metadata, risk flags, and scores, then deliberately copy a verified suggestion into a pending preview. Automatic publishing never displays the AI summary; it retains the permitted RSS excerpt. It additionally requires all of these gates: global AI and automation enabled; source `AUTO` mode; current approved commercial, headline, excerpt, cache, AI, and automation permissions; safe publisher URL; nonempty permitted excerpt of at least 30 characters; an enabled category; English language; relevance at least 0.8; confidence at least 0.9; and no risk flags. New sources start paused and in manual mode. Turning off global automation or ingestion halts new automatic publication; revoking rights withdraws existing publications.

Before enabling AI in staging, set the provider and key in the backend environment and restart the API workers, verify the publisher's permission for external AI processing, and set a conservative daily limit in News Settings. Before enabling global automation, run a supervised manual trial for each source, record explicit automatic publishing permission, and switch that source to Auto. Keep an operator watching the News run history and automation audit. Never put credentials in the admin UI or mobile config.

## Operations and incident response

- The worker checks due sources each minute and takes a database lease before import. Sources default to manual publication. It sends saved ETag/Last-Modified validators, records HTTP 304 as a successful no-change run, and records HTTP result, final URL, redirects, latency, and item counts. HTTP 401/403 marks the source blocked; do not evade the publisher restriction. Other failures receive configured exponential cooldown with jitter. The daily cleanup removes only completed runs older than the configured retention; stories and saved references remain intact.
- Prometheus `GET /metrics` exposes `news_ingestion_runs_total`, `news_ingestion_stories_total`, and `news_sources_blocked`. Install [the example alert rules](news-prometheus-alerts.yml) in the environment's Prometheus configuration and route notifications to the operations owner. The source dashboard and run history show the corresponding detail. Metrics are process-local, so aggregate counters across API replicas in queries.
- If rights expire or are revoked, public queries stop returning the source's stories. Revocation also pauses the source, sets approved stories back to pending, clears their publication dates, and writes an audit record. An editor can also withdraw a single story by changing moderation to pending or rejected.
- If a publisher requests takedown, revoke that source's rights immediately, record the request and action in the existing admin audit workflow, and check the public feed, detail, saved list, and Home highlight. Mobile offline cache may continue to display a prior feed while disconnected for up to 24 hours; online refresh removes withdrawn stories. This residual offline behavior needs a product retention policy before launch.
- To pause ingestion, pause sources in Admin. To roll back the application, leave the additive schema in place and keep sources paused; do not reverse the migration while old clients still reference its columns. Review saved stories and source rights before any later data cleanup.

## Verification still required

Local verification on 22 October 2026:

| Command | Result |
| --- | --- |
| `npx prisma migrate status` in `backend/` | 68 migrations applied; schema up to date, including all six News migrations |
| `npm test -- --runInBand src/news src/platform-admin/news-management-admin.spec.ts src/platform-admin/news-rights-admin.spec.ts` | 8 suites, 115 tests passed |
| `npm run test:e2e -- --runInBand --runTestsByPath test/news.e2e-spec.ts test/platform-admin.e2e-spec.ts` | 2 suites, 17 PostgreSQL-backed tests passed |
| `npm run build` in `backend/` and `platform-admin/` | Both production builds passed |
| `flutter test test/features/news test/shared/widgets/drift_news_image_test.dart` | 24 tests passed |
| `flutter analyze lib/features/news lib/shared/widgets/drift_news_image.dart lib/shared/widgets/drift_news_story_card.dart` | No issues |

The database-backed suites cover a controlled feed, connection test without import, RSS sync to pending review, editor publication, player visibility, withdrawal, equal-time cursor pagination, categories, settings, and server-side role restrictions. The large-text Flutter test uses a 390 px screen and 2× text size. An Android emulator browser check passed at 2× text size; production egress, staging smoke, and staging rollback rehearsal remain. Confirm a real publisher's exact licence separately. Provider tests use mocked responses; no live AI request was made without credentials. See the tracker for each launch gate.

An Android arm64 debug APK built successfully after increasing Gradle's project heap from 2 GB to 4 GB (`mobile/android/gradle.properties`). A Pixel 9 Pro Android 16 emulator displayed the News feed and detail at 2× text size with Drift fallback artwork, then opened a temporary QA story’s original link in the Android in-app browser. The local QA records were deleted afterward; a physical-device check remains optional. The optional Flutter web build currently fails in the existing `xxh3` dependency because several 64-bit integer literals cannot be represented exactly in JavaScript.
