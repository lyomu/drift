# Tennis RSS news: repository audit and implementation gap analysis

Audit date: 22 October 2026. Reference: `Drift_Sports_RSS_News_PRD_Technical_Spec.md` supplied for this handover. The document is a proposed product specification; its candidate feeds and licensing statements are not authorization to republish.

## Existing implementation

| Area | Present and reusable | Gap or change needed |
| --- | --- | --- |
| Flutter News | `/news`, `/news/saved`, and `/news/:id` routes; Riverpod repository/providers; feed, saved list, detail, category selection, pull to refresh, save action; Dio API client; `url_launcher` in-app browser | Repository returns only the first 20 stories, with no pagination or offline cache. Categories are hardcoded. Opening a source has no external fallback or HTTPS check. Feed's fallback image is a remote Unsplash URL, not a verified Drift asset. |
| Public NestJS API | Authenticated `GET /news`, `GET /news/:id`, saved-story actions; summary/detail mappers; `take`/`skip` and enum-category filtering | `APPROVED` is treated as published without source-rights checks. Ordering has no stable tie breaker. Saved list can return a subsequently rejected story. No category endpoint, cursor contract, or cache policy. Preserve existing response fields and saved-story behavior while extending them. |
| Database | Prisma/PostgreSQL `NewsSource`, `NewsStory`, `SavedStory`; fixed category and moderation enums; existing migration and seed | No rights record, approval evidence, source health, per-source poll interval, publication mode, ingestion run, news settings, unique dedup key, published timestamp, AI metadata, or editorial version. Fixed enum categories cannot be managed from admin. Seed inserts five fictional approved stories under an example.com source. |
| RSS worker | `NewsIngestionService` uses `rss-parser`; `@Cron('0 */6 * * *')` imports up to 20 items per active source as `PENDING`; `feed-fetch.ts` has HTTPS, IP, redirect, timeout, size, and optional host allowlist checks and unit tests | Cron runs in every API replica, with no distributed lease, per-source schedule, conditional GET, retry/backoff, run log, manual sync, or atomic dedup. It stores feed snippets before a rights decision. URL dedup is a read-then-create query without a unique constraint. Parser handling of DTD/entity input and response content type needs an explicit security check. |
| Platform admin | Existing Content navigation links to News Sources and News Stories. Source CRUD and basic approve/reject endpoints use `CONTENT_MANAGE`; audit writes use `AuditService`. Shared cards, tables, badges, modals, forms, and API client exist. | Source creation defaults to `ACTIVE`; no connectivity test, rights form, source health, sync control, dashboard, edit view, categories, settings, run history, or news-focused audit view. Approval bypasses rights/URL/content validation. Existing `CONTENT_MANAGE` is too broad for rights approval and operational controls; extend the existing RBAC catalog and seed roles. |
| Infrastructure | Global request throttler, Nest scheduler, Redis/BullMQ in video analysis, Redis in messaging, Prometheus metrics, existing environment validation | News does not use the queue, shared Prisma service, metrics, or a distributed lock. No reusable text-generation AI service/provider was found; video analysis is a separate CV worker. AI must be an optional, disabled-by-default adapter with a configured provider and budget. |

## Feed tests and rights status

From this development host on 22 October 2026, HTTP `HEAD` returned 200 for the four candidate URLs below. A bounded `GET` returned parseable RSS with a title, link, date, and description on the first item. These results do **not** establish availability from the production egress IP or permission to ingest commercially.

| Candidate | HTTP/format | Items observed | Rights conclusion |
| --- | --- | ---: | --- |
| BBC Tennis, `https://feeds.bbci.co.uk/sport/tennis/rss.xml` | 200, XML/RSS | 54 | BBC terms say business RSS/metadata use needs permission or a licence. Do not activate or publish without recorded permission. |
| Guardian Tennis, `https://www.theguardian.com/sport/tennis/rss` | 200, XML/RSS | 20 | Guardian RSS help says personal, noncommercial use; terms also restrict AI processing and commercial reuse. Do not activate or send feed text to AI without written permission. |
| Google News tennis search | 200, XML/RSS | 102 | Aggregator/discovery only. It supplies no rights from the underlying publishers. Do not use as a publication source. |
| Tennis Now, `https://tennisnow.com/feed/` | 200, XML/RSS | 10 | Terms allow sharing links and quoting short excerpts with attribution; prohibit whole-article republication, scraping, and automated-system training without permission. Scope of commercial RSS import and AI processing remains unverified. Keep disabled until reviewed. |

Source references: [BBC RSS/business terms](https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_19September2022english.pdf), [Guardian feed help](https://www.theguardian.com/help/feeds), [Guardian terms](https://www.theguardian.com/help/terms-of-service), [Tennis Now FAQ](https://tennisnow.com/faq/), [Tennis Now terms](https://tennisnow.com/terms-of-use/). Terms need a dated human review and a permission reference in admin before any source is enabled for public use.

## Implementation approach

1. **Make existing paths safe before expanding them.** Add a rights and publication gate to the current story query and moderation paths. Newly created feeds default to paused/manual review. Preserve the current mobile API shape and saved-story IDs. Remove fictional seed stories from production paths through an explicit data migration or safe seed policy, while retaining them for isolated tests.
2. **Extend the existing Prisma models.** Add `NewsSourceRights`, source scheduling/health fields, story publication/identity fields, `NewsIngestionRun`, and news settings. Introduce managed categories with a migration map from the current enum values, keeping compatibility for the mobile chips during rollout. Add unique source GUID/canonical hash constraints and a database-backed lease or BullMQ job identity for multi-instance idempotency.
3. **Reuse the secure fetcher and existing infrastructure.** Extend it to validate content type, conditional requests, and bounded decompression; reject DTD/entities; normalize only permitted fields; atomically upsert by identity; record run statistics and source health; enforce cooldown/backoff. Test candidate feeds through the admin before enabling. A production egress test is required.
4. **Extend the existing admin.** Add News Management pages using its current components, API client, permission guard, and audit service. Separate editorial permission from rights approval and automation control in the existing RBAC catalog. Every publish transition must check active, unexpired rights, allowed fields, safe original URL, required metadata, and source state in a transaction. Rights revocation must unpublish dependent stories.
5. **Rewire and extend Flutter incrementally.** Keep the current screens and saved-story flow. Add cursor pagination, server categories, durable cache with an accurate cached timestamp, Drift-owned local fallback art, HTTPS link validation, and external browser fallback. Preserve pull to refresh and current visual patterns.
6. **Add optional AI last.** No existing news AI abstraction is available. Use an adapter behind a disabled-by-default setting; send only fields explicitly permitted for AI processing; validate structured output and evidence; route failures to manual review. Never publish solely on model output.

## Proposed API and migration compatibility

- Retain `GET /news`, `GET /news/:id`, and save/unsave; append `nextCursor`, active categories endpoint, and richer attribution to the existing response. Avoid a breaking switch from `stories` to `items` until Flutter is deployed.
- Retain admin `/news/sources` and `/news/stories` routes; add source test/sync/rights, overview, editorial actions, categories, settings, run history, and audit filters under the existing platform-admin controller convention.
- Deploy additive schema first. Gate all new publication and fetching off by default. Backfill old source rights as `UNREVIEWED`, and unpublish external stories lacking recorded rights before turning on the new mobile feed. Seeded fictional stories require an explicit removal/migration decision because users may have saved them.
- Run a controlled test feed end to end before a real publisher feed. A real source may be enabled only after its actual permission evidence is entered and checked.

## Immediate risks and dependencies

- **Publication policy:** Existing seeded `APPROVED` stories are visible as real news, and admins can approve imported content with no rights check. Address this first.
- **Publisher permissions:** No candidate has been approved for Drift's intended commercial reuse or image use. This blocks a production real-source publication smoke test; it does not block implementing and testing the engine with a controlled feed.
- **Operational topology:** The current cron has no single-worker guarantee if the API has multiple replicas. Confirm the deployed replica count and Redis availability before enabling schedules.
- **Artwork:** Supply or create a Drift-owned local fallback asset. The current remote Unsplash fallback has no recorded reuse permission.
- **AI:** Provider credentials, data processing approval, cost limits, and permitted fields are outstanding. AI remains optional and off until configured.

## Verification baseline

Existing targeted suites: `backend/src/news/feed-fetch.spec.ts`, `backend/test/news.e2e-spec.ts`, and Flutter News presentation widget tests. The e2e suite depends on seeded stories and live PostgreSQL; adapt it to controlled fixtures as the seed policy changes. `npm test -- --runInBand news/feed-fetch.spec.ts` passed (37 tests). No application code or database migration was changed during this audit.
