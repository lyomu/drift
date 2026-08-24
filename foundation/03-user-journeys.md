# 03 — User Journeys

**Drift Tennis — Phase 1 Foundation, Document 3 of 7**

Every journey below follows: **ENTRY → ACTION → DECISION → SYSTEM RESPONSE → SUCCESS/FAILURE → NEXT ACTION.**

---

## 1. Primary Player Journey (end-to-end loop)

| Step | Detail |
|---|---|
| ENTRY | User discovers Drift (referral, app store, club, social) |
| ACTION | Registers |
| SYSTEM RESPONSE | Sends verification |
| ACTION | Verifies account |
| ACTION | Completes Onboarding (§2) → Adaptive Assessment (§3) → Suggested Level → Goals/Preferences/Location |
| SYSTEM RESPONSE | Generates Tennis Profile, lands on personalised Home |
| ACTION | Discovers players / competitions / courts (Discover, §5-7) |
| ACTION | Connects with a player |
| ACTION | Challenges player → Schedules match (§4) |
| ACTION | Plays match → Records result (§4) |
| DECISION | Opponent confirms or disputes |
| SYSTEM RESPONSE (success) | Rating, statistics, standings updated; optional reflection prompt |
| ACTION | Reviews skill development update, receives training recommendation (§8) |
| ACTION | Practices, tracks progress |
| NEXT ACTION | Finds next match — loop repeats |

This loop is the backbone every other journey plugs into.

---

## 2. Onboarding Journey

**Philosophy:** "Let's understand your game" — not a registration wizard. Every question exists to improve matchmaking, personalisation, or the development baseline. See §3 for the adaptive engine that powers the assessment step.

| Step | Detail |
|---|---|
| ENTRY | First app open (or "Sign Up" tap) |
| ACTION | Welcome screen → **Create Account** (email/phone + password, or social) |
| SYSTEM RESPONSE | Sends verification code/link |
| ACTION | **Verify** |
| DECISION | Code valid? |
| → Failure | Show inline error, allow resend, rate-limit resend attempts |
| → Success | Continue |
| ACTION | **Basic Profile** — name, photo (optional), playing hand |
| ACTION | **Tennis Experience** — "How long have you been playing?", "How often do you currently play?", "Have you competed before?", optional existing rating capture (§3.1) |
| SYSTEM RESPONSE | Determines assessment depth/branch (§3) |
| ACTION | **Adaptive Tennis Assessment** — branching behavioural questions (§3) |
| SYSTEM RESPONSE | Calculates **Suggested Level** with skill breakdown |
| ACTION | **Review Suggested Level** → **Confirm** or **Adjust** |
| SYSTEM RESPONSE | Stores System Suggested Level + User Selected Level separately |
| ACTION | **Goals** (multi-select) |
| ACTION | **Playing Preferences** — Singles/Doubles/Both, Social/Competitive/Both, preferred times |
| ACTION | **Location** — general location/city |
| ACTION | **Club / Preferred Courts** (optional at this stage — skippable) |
| ACTION | **Availability** |
| ACTION | Optional: **"Do you also play Padel?"** — Yes / No / I'd like to learn (§9) |
| SYSTEM RESPONSE | Generates Tennis Profile; computes **Personalised Recommendations** |
| SUCCESS | Lands on **Home** with "Your Next Move" actions pre-populated (never an empty dashboard) |
| FAILURE / RECOVERY | If onboarding is interrupted at any step (app closed, connection lost), resume exactly where the user left off on next open — never restart from Welcome |

### Interruption & edge cases
- Skipping optional steps (Club/Preferred Courts) still allows Suggested Level calculation using default/looser matchmaking radius.
- If verification fails repeatedly, allow "verify later" with restricted account state (no match/competition participation until verified) rather than blocking registration entirely.
- Back navigation is always available except after Level Confirm (adjusting level afterward happens from Profile, not by re-entering onboarding).

---

## 3. Adaptive Tennis Assessment — Logic

### 3.1 Branching inputs
The assessment engine uses answers to **Tennis Experience** (§2) as the entry condition:

| Signal | Branch |
|---|---|
| "I'm completely new" | **Beginner branch** — 3-4 short behavioural questions covering only Forehand, Backhand, Serve basics, and general rally tolerance. No net play, no tactical, no pressure-based questions. |
| "Less than 6 months" / "6-12 months" | **Foundational branch** — adds basic Return and Movement questions; still avoids advanced tactical/pressure framing. |
| "1-2 years" / "2-5 years" | **Intermediate branch** — full dimension set (Forehand, Backhand, Serve, Return, Net Play, Movement, Match Play) at intermediate framing. |
| "5+ years" / "Competitive/advanced" | **Advanced branch** — full dimension set with advanced/pressure-based framing throughout, plus competition-experience questions (club/local/regional/national/elite). |
| Existing recognised rating supplied | Used as **one signal alongside** the behavioural answers — not an override. If it disagrees substantially with the behavioural result, the system favours the behavioural result but surfaces both in the review step ("You told us your USTA rating is X; based on your answers we'd suggest starting around Y — you can pick either"). |

### 3.2 Question design rule
No "rate yourself 1-10." Every skill question is **behavioural**, e.g.:

> *When rallying from the baseline, which best describes you?*
> A. I struggle to keep the ball in play consistently.
> B. I can exchange a few shots at a comfortable pace.
> C. I can maintain longer rallies consistently.
> D. I can control direction and depth.
> E. I can vary pace/spin and attack shorter balls.
> F. I can execute these skills consistently under match pressure.

Each option maps to a point value on that dimension; dimension scores combine into the Suggested Level.

### 3.3 Progressive disclosure algorithm (conceptual)
1. Start with Tennis Experience answers → set initial branch + question depth budget (Beginner: ~6 questions total; Foundational: ~9; Intermediate: ~12; Advanced: ~15).
2. Ask dimension questions in fixed pillar order (Forehand → Backhand → Serve → Return → Net Play → Movement → Match Play), skipping pillars outside the current branch's scope.
3. After each answer, if a response lands at the *bottom* of the branch's expected range twice in a row, the engine may downshift remaining questions to a simpler framing (protects against over-asking a player who self-identified too high).
4. Assessment always ends with one **Match Play** question (understanding scoring / competitive experience) regardless of branch, since it's the strongest single signal for separating social from competitive intent.

| Step | Detail |
|---|---|
| ENTRY | Immediately follows Tennis Experience in onboarding (also re-enterable later from Profile → "Retake Assessment") |
| ACTION | User answers branch-appropriate behavioural questions, one per screen, with progress indicator |
| SYSTEM RESPONSE | Live-computes provisional dimension scores (not shown to user mid-assessment) |
| DECISION | All required questions for branch answered? |
| → No | Continue to next question per §3.3 |
| → Yes | Calculate Suggested Level |
| SYSTEM RESPONSE | Presents Suggested Level (e.g. "Level 6.0 — Intermediate") + skill breakdown (Serve/Forehand/Backhand/Return/Net Play/Movement/Match Play) + plain-language explanation |
| ACTION | **Confirm Level** or **Adjust Level** (manual slider override) |
| SYSTEM RESPONSE | Stores `system_suggested_level` and `user_selected_level` as distinct fields |
| NEXT ACTION | Continue onboarding to Goals |

---

## 4. Match Journey (Challenge → Schedule → Play → Result)

### 4.1 Player Discovery & Connection

| Step | Detail |
|---|---|
| ENTRY | Play → Find Players, or Discover → Players |
| ACTION | Applies filters (distance, level, availability, singles/doubles, social/competitive, club, preferred courts) |
| SYSTEM RESPONSE | Returns ranked results (proximity + level compatibility weighted) |
| ACTION | Opens Player Profile |
| DECISION | Connect first, or Challenge directly? |
| → Connect | Sends connection request → **pending** state |
| → Challenge directly | Skips connection, sends challenge (connection auto-created on accept) |
| SYSTEM RESPONSE | Notifies recipient |
| SUCCESS | Recipient accepts → connection established / challenge enters scheduling |
| FAILURE | Recipient declines or ignores (expires after a defined window) → requester notified, no penalty state |

### 4.2 Match Challenge & Scheduling

Structured actions — chat supports but never replaces this workflow.

| Step | Detail |
|---|---|
| ENTRY | From Player Profile, or from an accepted Connection |
| ACTION | **Challenge Player** |
| ACTION | **Propose Time** (date/time options) |
| DECISION | Recipient accepts, counter-proposes, or declines? |
| → Counter-propose | Returns to proposer for accept/counter (bounded to prevent infinite loop — 3 rounds before prompting a call-to-chat) |
| → Decline | Challenge closed, both notified, no penalty |
| → Accept | Continue |
| ACTION | **Suggest Court** (from Court Finder or manual entry) |
| DECISION | Opponent accepts suggested court? |
| → No | Suggest alternate / open Court Finder together via shared link |
| → Yes | Continue |
| ACTION | **Confirm Match** |
| SYSTEM RESPONSE | Match enters `Scheduled` state; both calendars/reminders set; **Open Booking** link surfaced if the court supports it |
| DECISION | Change of plans before match time? |
| → Reschedule | Returns to Propose Time step, match state → `Rescheduled` |
| → Cancel | Match state → `Cancelled`, both notified |
| → No change | Reminder sent ahead of match time |
| NEXT ACTION | Play Match |

**State model:** `Proposed → Scheduling → Scheduled → (Rescheduled | Cancelled | Expired) → Played`

### 4.3 Match Result Flow

| Step | Detail |
|---|---|
| ENTRY | Post-match, from Home ("Enter your result") or Play → Active Matches |
| ACTION | **Enter Score** (set-by-set, singles or doubles scoring model) |
| ACTION | **Submit** |
| SYSTEM RESPONSE | Notifies opponent to review |
| DECISION | Opponent **Confirms** or **Disputes** |
| → Confirms | Result finalises |
| → Disputes | Match state → `Disputed`; both parties prompted for their version; unresolved disputes escalate to Club Admin (or Platform Admin if no club context) for manual resolution |
| → No response within window | Auto-reminder, then defined grace-period resolution rule (documented fully in Document 6, Business Rules) |
| SYSTEM RESPONSE (finalised) | Updates: match history, statistics, competitive rating, league standings (if applicable), rankings (if applicable), achievements, recent form |
| ACTION (optional) | **"How did your game feel?"** lightweight reflection (confidence, notes) |
| SYSTEM RESPONSE | Feeds Skill Development Profile alongside assessment/practice signals |
| NEXT ACTION | Home surfaces development recommendation based on result + reflection |

**Match states:** `Proposed → Scheduling → Scheduled → Completed | Walkover | Retired | Cancelled | Disputed | Expired`

---

## 5. Competition Journey (League / Season / Round / Standings)

| Step | Detail |
|---|---|
| ENTRY | Compete tab, or a Home recommendation |
| ACTION | Browses league/ladder/tournament list, opens **League Detail** → Rules → Season Detail → Registered Players |
| DECISION | Registration open? |
| → Closed | Show **Waitlist** option |
| → Open | **Register** |
| SYSTEM RESPONSE | Confirms registration, sets state `Enrolled` (or `Waitlisted`) |
| SYSTEM RESPONSE (season start) | Round generated, opponent(s) assigned, official **Announcement** sent (distinct from casual community chat) |
| ACTION | Contacts opponent (feeds into §4.2 Match Challenge/Scheduling flow, pre-filled with competition context) |
| ACTION | Plays match, records result (§4.3) — result auto-applies to **Standings** |
| DECISION | Match not completed before round/season close? |
| → Unplayed | Defined resolution rule applies (walkover, extension, or forfeit — per league rules configured by Club Admin) |
| SYSTEM RESPONSE | Standings update, next round opens |
| SUCCESS (season end) | Season marked `Completed`, final standings + any awards/achievements issued, full history retained |
| NEXT ACTION | Register for next season, or explore a different competition format |

**Competition states:** `Draft → Registration Open → Registration Closed → Scheduled → Active → Completed | Cancelled`

---

## 6. Court Discovery & Booking Journey

| Step | Detail |
|---|---|
| ENTRY | Discover → Courts, or "Suggest Court" inside match scheduling |
| ACTION | Map or List view, applies filters (distance, surface, indoor/outdoor, lighting, public/private, amenities, booking availability) |
| ACTION | Opens **Court Profile** |
| SYSTEM RESPONSE | Displays address/map, photos, amenities, hours, contact, Google Business data where permitted/available |
| DECISION | Booking route available? |
| → External booking link | Opens external booking flow (in-app browser) |
| → Contact only (call/WhatsApp) | Opens native call/message intent |
| → Native booking (future/partner venues only) | Placeholder — never fabricated availability |
| ACTION (optional) | **Save Court** for later |
| ACTION (optional) | **Report/Update Court Info** if data looks wrong |
| SYSTEM RESPONSE | Flags submitted correction for review (Club Admin if claimed, else Platform Admin moderation queue) |
| NEXT ACTION | Add court to an in-progress match challenge, or Get Directions |

---

## 7. Coach Discovery Journey

| Step | Detail |
|---|---|
| ENTRY | Discover → Coaches |
| ACTION | Filters by location, club, specialisation, level taught |
| ACTION | Opens **Coach Profile** (bio, qualifications, experience, specialisations, availability, ratings/reviews if enabled) |
| ACTION | **Contact / Booking** (external contact channel in MVP; native coach booking is P1/P2) |
| NEXT ACTION | Optionally links coach feedback into the player's Skill Development Profile (P1 capability — coach-submitted assessment input) |

---

## 8. Learning, Skill Development & Practice Journey

| Step | Detail |
|---|---|
| ENTRY | Profile → Skill Development, or a Home recommendation ("Your backhand could use work — try this drill") |
| ACTION | Views **Skill Profile** (Serve/Forehand/Backhand/Return/Net Play/Movement/Match Play, each with a development percentage) |
| ACTION | Opens **Skill Detail** for a weak area |
| SYSTEM RESPONSE | Surfaces recommended Lesson/Drill tied to that skill + player's level |
| ACTION | Completes lesson/drill content (tip, video, or drill instructions) |
| ACTION | **Sets a Goal** (skill-specific, with target and optional deadline/milestones) |
| ACTION | Logs a **Practice Session** (date, duration, skill focus, drill, notes, perceived performance) — kept lightweight, not a long form |
| SYSTEM RESPONSE | Updates Skill Development Profile using a blended signal: initial assessment + practice logs + match reflections + (future) coach feedback |
| ACTION | Views **Progress History** / **Progress Report** over time |
| NEXT ACTION | Home surfaces the next recommended drill/lesson tied to the still-weakest goal-linked skill |

**Design rule carried from the brief:** Development percentages are never presented as more scientifically precise than the underlying data supports — early on (assessment-only data), the UI should read as directional ("Building"), not falsely precise ("58.3%").

---

## 9. Padel Expansion Journey ("Add Padel")

| Step | Detail |
|---|---|
| ENTRY | Profile → My Sports → **+ Add Padel** (also reachable if the user answered "I'd like to learn" at onboarding — a reminder card appears once, non-blocking) |
| ACTION | Confirms intent to add Padel |
| ACTION | Completes a **separate adaptive Padel assessment** — same behavioural-question philosophy as Tennis (§3), scoped to Padel dimensions (rally consistency, forehand, backhand, serve, return, volley, overhead, bandeja, vibora, smash, wall usage, positioning, net control, transition, partner communication, tactical awareness) |
| DECISION | Beginner-branch player? |
| → Yes | Advanced technique questions (bandeja, vibora, double-wall situations) are **never asked** |
| → No | Full dimension set at appropriate depth, mirroring the Tennis branching logic in §3.1 |
| SYSTEM RESPONSE | Generates a separate **Padel Profile** (rating, skill profile, preferences, goals) — fully independent of the Tennis Profile |
| SUCCESS | Padel now appears: as a card under My Sports; as a filter chip in Players/Courts/Compete/Learn; **never** as a global switcher |
| NEXT ACTION | User can discover Padel players/courts/competitions using the same Play/Compete/Discover flows, sport-scoped by the Padel filter |

---

## 10. Club Administrator Journey

*(Club/Community Admin web app — deferred build phase; journey documented now for architectural coherence.)*

| Step | Detail |
|---|---|
| ENTRY | Receives an invitation (from Platform Admin approval, or self-service club creation pending verification) |
| ACTION | Accepts invitation, sets up **Club Profile** (photos, amenities, hours, booking contacts, Google profile link) |
| ACTION | Submits **Verification Request** |
| SYSTEM RESPONSE | Platform Admin reviews and approves/rejects |
| ACTION | Invites/approves **Members** |
| ACTION | Creates a **Competition** (league/ladder/tournament) — configures rules, format, registration window |
| SYSTEM RESPONSE | Competition visible to eligible players in mobile Compete tab |
| ACTION | Opens/monitors Registration, manages Waitlist |
| ACTION | Generates/edits **Fixtures** for each round |
| ACTION | Reviews submitted **Results**, resolves **Disputes** escalated from mobile |
| SYSTEM RESPONSE | Standings recalculate automatically; admin can manually override with an audited reason |
| ACTION | Sends **Announcements** (distinct from Community conversation) |
| ACTION | Manages **Courts** (add/edit, availability notes, maintenance notices) and **Coaches** |
| NEXT ACTION | Reviews **Reports** (engagement, court inquiries, event turnout) to plan the next season/event |

---

## 11. Platform Administrator Journey

*(Platform Admin dashboard — deferred build phase; journey documented now for architectural coherence.)*

| Step | Detail |
|---|---|
| ENTRY | Logs in with 2FA |
| ACTION | Reviews **Platform KPI Dashboard** (activation, engagement, court coverage, community adoption, retention, revenue) |
| ACTION | Processes pending **Organization/Club Verification** requests |
| ACTION | Reviews **Venue** duplicate-merge queue and Google Places sync status |
| ACTION | Moderates **Reported Content** (users, messages, news stories) and escalated **Disputes** |
| ACTION | Manages **News Sources** (add/pause a feed, review ingestion logs, moderate individual stories before they surface) |
| ACTION | Manages **Learning Content** library (approve club-authored content, curate the core lesson/drill catalogue) |
| ACTION | Reviews **Subscriptions/Payments**, resolves billing exceptions |
| ACTION | Adjusts **Feature Flags** / **Configuration** (e.g., opening a new city/market) |
| SYSTEM RESPONSE | All consequential actions (suspensions, refunds, verification decisions, config changes) write to the **Audit Log** |
| NEXT ACTION | Reviews **System Health** and **Analytics** to prioritise the next operational focus |

---
*Previous: [`02-information-architecture.md`](./02-information-architecture.md) · Next: [`04-screen-inventory.md`](./04-screen-inventory.md)*
