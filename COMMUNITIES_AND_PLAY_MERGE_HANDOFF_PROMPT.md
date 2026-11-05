# Handover prompt: finish the Play/Compete merge + Communities feature

Paste the prompt below into the implementation session. The approved plan is `~/.claude/plans/create-a-plan-wobbly-jellyfish.md` (also mirrored in this repo's git history of this session). Progress is tracked in [PROGRESS.md](PROGRESS.md) under "Play/Compete merge + Communities".

---

You are working in the Drift Tennis repository, on branch `language`. A prior session implemented Phases 1–6 of a 7-phase plan (see `~/.claude/plans/create-a-plan-wobbly-jellyfish.md` if still present, otherwise reconstruct intent from `PROGRESS.md` and the diff). **Do not re-design anything — the code for Phases 1–6 is written. Your job is Phase 2's migration and Phase 7 (tests + manual verification), plus fixing anything that surfaces along the way.**

## What's done (code written, not yet built or tested)

1. **Play/Discover restructure (mobile + 2 backend links):** Play and Compete merged into one Play hub (`mobile/lib/features/matches/presentation/play_hub_screen.dart`) with segments Matches (Challenges/Active/History chips) · Leagues · Ladders · Tournaments · Events. Play → Find moved into Discover as "Find players" (`discover_hub_screen.dart`, `player_search_screen.dart`). Bottom nav is now Home · Play · Community · Discover · Learn (`core/shell/`). Old `?tab=compete`, `?play=find|challenges|active|history` links redirect via `core/router/app_router.dart`. Match cards show a league/ladder/tournament tag from a new backend `competitionLabel` field (`backend/src/matches/match.mapper.ts`).
2. **Backend schema (Phase 2):** `backend/prisma/schema.prisma` has new models `Community`, `CommunityMember`, `CommunityPhotoAsset`, `CommunityReport`, `CommunityAuditLog` and enums (`CommunityType/Status/JoinPolicy/Frequency/Role/MemberStatus`). `Conversation` gained `COMMUNITY` type + `communityId`. `League`/`Ladder` gained `communityId` (`Ladder.clubId` is now **optional**). `NotificationCategory` gained `COMMUNITIES` (+ preference field). `common/demo-scope.ts` gained community scopes; new `common/community-scope.ts` helper. **`npx prisma validate` and `prisma format` have been run and pass — but no migration has been generated or applied yet.**
3. **Backend `communities` module (Phase 3):** `backend/src/communities/` (service, controller, DTOs, mapper) covering search/mine/detail, create, join (OPEN/BY_REQUEST), cancel, leave, approve/decline, remove, roles, transfer, delete, mute, report+exit, photo upload + public `/media/community-photos/:id`, community ladders/leagues, disputes. Club-admin: `backend/src/club-admin/club-community-admin.controller.ts`. Platform-admin: `backend/src/platform-admin/community-admin.controller.ts`. `trust-safety-admin.service.ts` gained a `COMMUNITY` report type. `messaging.service.ts` gained group-chat support (sender name/photo on messages, muted-member skip, suspended = read-only). EN/FR/ES push copy added to `backend/src/common/i18n/messages.*.ts`.
4. **Platform-admin UI (Phase 4):** `platform-admin/app/(dashboard)/communities/` (queue + detail), nav entry, `COMMUNITY` filter in Reported Content Queue.
5. **Club-admin UI (Phase 5):** `club-admin/app/(dashboard)/community/page.tsx`, nav entry, full EN/FR/ES catalog strings.
6. **Mobile Community feature (Phase 6):** `mobile/lib/features/communities/` (repository, providers, hub screen, create sheet, detail screen, manage screen, create-league screen, report sheet, member tile), new routes in `app_router.dart`, group-chat support in `chat_thread_screen.dart`/`inbox_screen.dart`, Communities toggle in notification preferences, shared `drift_community_card.dart`. All ARB strings added to `app_en.arb`/`app_fr.arb`/`app_es.arb` — verified zero missing keys and full EN/FR/ES parity by script before this handover.

## What's NOT done — start here

**Phase 2 migration (blocking everything else):** `npx prisma migrate dev` refuses to run because this environment is non-interactive. Resolve this first — options:
- Try `npx prisma migrate dev --name communities` in an interactive terminal if one is available to you, OR
- Generate the SQL directly (Prisma 7's CLI moved to `--from-config-datasource`/`--to-schema` flags, not `--from-url`; `prisma.config.ts` reads `DATABASE_URL` from `.env`) and hand-create the migration folder, then `npx prisma migrate resolve --applied <name>` or `npx prisma migrate deploy`.
- Verify the result with `npx prisma migrate status` and `npx prisma generate`.

**Phase 7 — tests and verification (one pass, per project convention):**
- Backend: add `backend/src/communities/communities.service.spec.ts` covering: join OPEN vs BY_REQUEST; approve/decline; leave as owner (blocked unless last member) vs last member (deletes); removal permissions (admin can't remove owner/other admins); transfer; PENDING community invisible to non-creator; SUSPENDED blocks join and chat; community league/ladder registration requires ACTIVE membership; demoScope isolation. Extend `trust-safety-admin.service.spec.ts` (if present) for COMMUNITY reports and `notifications.service.spec.ts` for the COMMUNITIES preference. Run `npm test` (do **not** run `npm run lint` — it auto-rewrites ~24 unrelated files, per project convention).
- Mobile: `flutter gen-l10n`, `flutter analyze`, `flutter test`. Add widget tests for the Play hub chips, the Discover rename, the Community hub empty/list states, and the create-sheet validation.
- Manual pass: backend on `:3009` (not 3000 — already taken by another project on this machine), mobile via `mobile/tool/dev_run.sh` on the emulator (not `flutter run` — serves stale APKs on this machine), plus platform-admin and club-admin dev servers.
- End-to-end flow to walk manually: player A creates a community (shows "Under review") → platform admin approves (A gets push) → player B finds it near them, requests to join (A gets push, approves; B gets push) → B and A chat → A creates a ladder and a league; B joins both → B's ladder match shows under Play → Matches → Active with the competition label → B reports and exits (appears in platform-admin Reports) → platform admin suspends the community (chat locks) → a club admin creates the club's own community from club-admin.
- Re-check the old links: `?tab=compete`, `?tab=play&play=find`, `?play=active`, in FR and ES too.

## Constraints to keep

- Code first, test in one pass at the end — do not build/run things mid-fix unless you're actually in the verification phase now.
- Every new user-facing string ships in EN/FR/ES (mobile ARB, club-admin messages, backend i18n); platform-admin stays English-only.
- New discovery queries must go through `demoScope()` / `communityMembersOnly()`.
- Images are file uploads to the media store, never pasted URLs (already followed for community photos — don't regress it).
- Update `PROGRESS.md`'s "Play/Compete merge + Communities" row at each phase boundary, not just at the end.

Report back with: migration outcome, test results (counts, pass/fail), lint/analyze output, manual walkthrough results with any bugs found and fixed, and what (if anything) remains.
