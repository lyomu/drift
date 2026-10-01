# Spec: level band on leagues

**Status:** proposed, not implemented.
**Raised by:** the 2026-10 Compete redesign. The mock's league card shows a
level under the format ("Singles · Intermediate", "Doubles · All levels").
Nothing in `League` models a level, so the card ships without that line and
this spec is what would put it back.

---

## 1. The problem

A player browsing Compete cannot tell whether a league is meant for them. The
card says the format and how many have joined; it does not say whether the
field is beginners or county-level players. That is the single most useful
thing to know before tapping Join, and it is the reason the mock put it
there.

Today the only way to find out is to open the league and read the free-text
description, which clubs may or may not have filled in.

## 2. What exists already

Do not invent a new level scale. The pieces are in place:

- **`AssessmentBranch`** (`prisma/schema.prisma`): `BEGINNER | FOUNDATIONAL |
  INTERMEDIATE | ADVANCED`. Already the app's level vocabulary.
- **`labelForLevel`** (`src/common/level-label.util.ts`): maps a numeric
  level (1.0–7.0) onto those four bands at 2.5 / 4.0 / 5.5. This is what
  `PlayerSummary.levelLabel` already shows on every player card.
- **`LearningContent.branch`** is `AssessmentBranch?`, where **null means
  "suitable at any level"**. That is exactly the semantic the card's "All
  levels" needs, and the precedent to copy.
- **`playerCompetitionLevel`** (`src/competitions/player-level.ts`): resolves
  a player's single numeric level, preferring `userSelectedLevel` over
  `systemSuggestedLevel`.

## 3. Proposed change

### 3.1 Schema

Add one nullable column to `League`:

```prisma
// The level this league is pitched at, reusing the same AssessmentBranch
// tiering as the onboarding assessment and LearningContent rather than
// inventing a second scale. Null means "all levels" — the league is open to
// anyone, which is the default and what most club leagues are.
levelBand AssessmentBranch?
```

Migration: `prisma/migrations/20261002120000_league_level_band/`. Additive and
nullable, so existing rows need no backfill and correctly read as "all
levels".

**Rejected alternative:** numeric `levelMin`/`levelMax` on the league, mirroring
`PlayerFilters`. More expressive (a league could say 3.5–5.0), but it invents a
second level vocabulary for leagues, makes the badge label ambiguous (what do
you print for 3.5–5.0?), and nothing in the product asks for that precision.
If a club genuinely needs a custom range, that is a separate feature and the
description field covers it in the meantime.

### 3.2 API

- `CreateLeagueDto` / `UpdateLeagueDto` (`src/club-admin/dto/league.dto.ts`):

  ```ts
  @IsOptional()
  @IsEnum(AssessmentBranch)
  levelBand?: AssessmentBranch;
  ```

- `toLeagueSummary` (`src/competitions/competitions.service.ts`): add
  `levelBand` to the parameter type and to the returned object, beside
  `format`. No other mapper changes — every league read goes through it.

### 3.3 Club Admin

`app/(dashboard)/leagues/page.tsx` already has the create form with
sport/format/rounds/capacity selects. Add a **Level** select next to Format:

    All levels (default) · Beginner · Foundational · Intermediate · Advanced

Add `levelBand` to the `League` type in `lib/types.ts`, and show it on the
league list row beside the existing `sport / format / rounds` line.

### 3.4 Mobile

- `League` (`features/competitions/data/competitions_repository.dart`): add
  `final String? levelBand;` and parse it. Add a label getter mapping the
  enum to display text, with null → `'All levels'`.
- `DriftLeagueCard` (`shared/widgets/drift_league_card.dart`): pass the label
  as `meta` on the existing `DriftCompetitionCard`. The slot is already there
  and currently unused by this card — it renders as "Singles · Intermediate",
  which is the mock exactly. **This is a one-line change** once the field
  exists.
- League detail (`league_detail` screen): show the band in the header
  alongside format.

## 4. Advisory, not enforced

**The band does not gate registration.** `register()` today checks the
registration window, duplicate registration and capacity, and nothing else.
This spec does not add a level check, for three reasons:

1. **The house voice is beginner-safe and non-intimidating.** Locking someone
   out of a league because of a number they picked about themselves during
   onboarding is the opposite of that.
2. **`playerCompetitionLevel` returns `0` for a player with no level at all.**
   A naive gate would lock every un-assessed player out of every banded
   league — the people most in need of a first league.
3. Clubs set these bands as guidance. A 4.4 player wanting into an
   "Intermediate+" league is a conversation for the club, not a 403.

**Follow-up worth considering, not in scope here:** a soft confirm on the Join
tap when the player's level falls outside the band ("This league is pitched at
Advanced players. Join anyway?"). That gives the signal without taking the
decision away. It needs the player's own level on the Compete screen, which
the list payload does not currently carry.

## 5. Also unlocked by this

The Compete tab has no filter sheet. Once `levelBand` exists, adding one is
cheap: `DriftFilterSheet` (`shared/widgets/drift_filter_sheet.dart`) is the
app-wide standard as of the 2026-10 Discover pass, and a Compete sheet would
be Level / Format / Sport sections over the same draft-and-apply contract.
Worth doing in the same pass as the filtering is the point of the band.

## 6. Order of work

1. Schema + migration.
2. DTOs + `toLeagueSummary`. `npx jest src/competitions --runInBand`
   (**note: `--runInBand` is required** — the parallel workers OOM on this
   suite and report as suite failures rather than assertion failures).
3. Club Admin form, type and list row.
4. Mobile model, card `meta`, league detail.
5. Seed data: give the demo leagues varied bands so the card reads as the
   mock does. `backend/scripts/seed-demo-content.mjs`.

## 7. Open questions for the product side

- Should the band be **required** on new leagues created in Club Admin?
  Defaulting to "All levels" is safe, but an optional field tends to stay
  empty, and an empty band is exactly the problem this solves.
- Does padel need its own band vocabulary? `PadelProfile` carries a separate
  assessment and rating. If padel bands differ, `levelBand` needs to be read
  against the league's `sport`.
