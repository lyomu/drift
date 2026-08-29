# Drift Tennis

Drift Tennis is a platform for tennis (and padel) communities — clubs, ladders,
leagues, tournaments, coaching, court discovery, and a social feed. This
repository is a monorepo containing the mobile app, two admin web apps, the
backend API, and the product/design foundation docs.

## Repository layout

| Path             | Stack                       | Description                                                        |
| ---------------- | --------------------------- | ---------------------------------------------------------------- |
| `mobile/`        | Flutter (Dart)              | The player-facing mobile app (`drift_tennis`).                     |
| `backend/`       | NestJS + Prisma + PostgreSQL | REST API, auth, payments, home feed, competitions, admin services. |
| `club-admin/`    | Next.js (App Router)         | Club-level admin console (members, courts, events, billing, etc.). |
| `platform-admin/`| Next.js (App Router)         | Platform operator console (tenant/club management, moderation).    |
| `foundation/`    | Markdown                     | Product strategy, IA, user journeys, screen inventory, design system, architecture, roadmap. |

Additional working notes live in `PROGRESS.md`, `HANDOVER.md`, `PENDING-SCREENS.md`,
`SECURITY_REVIEW.md`, and `HOME-AND-POLISH-PLAN.md`.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 14+
- Flutter SDK (stable channel) with Android/iOS toolchain for `mobile/`

## Getting started

### Backend API

```bash
cd backend
npm install
cp .env.example .env          # then fill in DATABASE_URL and secrets
npx prisma migrate dev        # apply migrations
npm run start:dev             # http://localhost:3000 (set PORT to override)
```

Tests: `npm test` (unit) and `npm run test:e2e` (end-to-end).

> Note: on this machine port 3000 is used by another project — run the backend on
> `PORT=3009` and point the clients at it.

### Club admin / Platform admin (Next.js)

```bash
cd club-admin      # or: cd platform-admin
npm install
npm run dev
```

Configure the API base URL via the app's `.env.local` (see `lib/api-client.ts`).

### Mobile app (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

For local device installs that avoid stale APK caching, use `mobile/tool/dev_run.sh`.

## Conventions

- Keep `PROGRESS.md` updated at every phase boundary, not just at session end.
- APK builds, logs, `qa-evidence/`, and `_legacy-mobile-ui/` are git-ignored
  local artifacts.

## License

Proprietary — all rights reserved.
