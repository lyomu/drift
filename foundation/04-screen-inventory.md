# 04 — Complete Screen Inventory

**Drift Tennis — Phase 1 Foundation, Document 4 of 7**

This is the complete screen inventory across all three front ends, per your Section 39/40/41 requirements. **123 mobile screens, 44 Club Admin screens, 52 Platform Admin screens (219 total).**

## How to read this document

Every screen specifies: **Purpose · Entry Point · Primary Action · Secondary Actions · Data · States · Empty State · Error State · Connects To**, exactly as requested. To keep 219 screens legible rather than repeating boilerplate 219 times, generic behaviours are defined once here and referenced as **"Standard"** in a screen's row:

- **Standard Loading** = skeleton placeholders matching the final layout (never a blocking spinner over the whole page) — see Document 5, Loading States.
- **Standard Error** = inline retry affordance + toast for background actions; full-page error only when the screen has no usable content without the failed call (see Document 5, Error/Alert components). Poor-network handling (retry, optimistic updates, offline-friendly reads) follows the rules in Document 6.
- **Standard Empty** = illustration + one-sentence explanation + a single primary CTA that resolves the emptiness (never a dead end). The specific copy differs per screen and is noted where it's non-obvious.
- **Standard List States** = Loading / Populated / Empty / Error / Offline-cached (read-only banner).

Where a screen's behaviour is *not* generic, the row spells it out (this is most true for match, competition, and result screens, since those states are core business logic, not UI boilerplate).

---

## PART A — Mobile App (Flutter)

### A.1 Authentication

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Splash | Brand moment + session check | App cold start | — (auto-advances) | — | Session token | Checking session | n/a | Retry on failed session check | Welcome or Home |
| Welcome | First impression, choose path | Splash (no session) | Sign Up | Log In | — | Standard | n/a | n/a | Sign Up, Login |
| Sign Up | Create account | Welcome | Create Account | Switch to Login | Email/phone, password | Standard + inline validation | n/a | Field-level + "account exists" handling | Verify |
| Login | Authenticate returning user | Welcome | Log In | Forgot Password, Switch to Sign Up | Email/phone, password | Standard | n/a | "Invalid credentials" inline, lockout after repeated failures | Home (if onboarded) or resume Onboarding |
| Verify (OTP/Email) | Confirm identity | Post Sign Up | Enter code | Resend code | 6-digit code | Sending / Verifying / Verified | n/a | Invalid/expired code, resend rate-limit | Basic Profile |
| Forgot Password | Recover account access | Login | Send reset link | Back to Login | Email/phone | Standard | n/a | "No account found" (generic, non-enumerating) | Login |

### A.2 Onboarding

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Basic Profile | Capture name, photo, hand | Post-verify | Continue | Skip photo | Name, photo, playing hand | Standard | n/a | Upload failure retry | Tennis Experience |
| Tennis Experience | Broad experience questions (§3.1 in Journeys doc) | Basic Profile | Continue | Back | Duration, frequency, competition history, existing rating | Standard | n/a | Standard | Adaptive Assessment (branch selected) |
| Adaptive Assessment — Question | One behavioural question per screen | Tennis Experience | Select answer → auto-advance | Back | Answer option | Progress indicator (question N of branch budget) | n/a | Standard | Next question or Suggested Level |
| Assessment Progress (interstitial) | Reassure mid-length assessment | Mid-assessment (branch-dependent) | Continue | — | — | n/a | n/a | n/a | Next question |
| Suggested Level Review | Present computed level + breakdown | End of assessment | Confirm Level | Adjust Level | System Suggested Level, skill breakdown | Standard | n/a | Calculation failure → fallback to manual level pick | Adjust Level or Goals |
| Adjust Level | Manual override of suggested level | Suggested Level Review | Save adjusted level | Cancel (revert to suggested) | User Selected Level | Standard | n/a | Standard | Goals |
| Goals | Multi-select player goals | Level confirmed/adjusted | Continue | Skip | Goal selections | Standard | n/a | n/a | Playing Preferences |
| Playing Preferences | Singles/doubles, social/competitive, times | Goals | Continue | Skip | Format pref, style pref, time slots | Standard | n/a | n/a | Location |
| Location | General location/city | Playing Preferences | Continue | Use current location | City/area | Standard | n/a | Location permission denied → manual entry fallback | Club/Preferred Courts |
| Club / Preferred Courts | Optional club/court affiliation | Location | Continue | Skip | Club search, court search | Standard | "No club yet? Skip for now" | Standard | Availability |
| Availability | Preferred playing windows | Club/Preferred Courts | Continue | Skip | Availability grid | Standard | n/a | n/a | Padel Interest Prompt |
| Padel Interest Prompt | Lightweight, optional | Availability | Yes / No / I'd like to learn | Skip | Padel interest flag | Standard | n/a | n/a | Onboarding Complete |
| Onboarding Complete | Confirms profile created, shows first recommendations | Padel Interest Prompt | Go to Home | — | Personalised next actions | Generating recommendations | n/a | Fallback generic next actions if personalisation fails | Home |

### A.3 Home

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Home Dashboard | "What should I do next?" — dynamic priority feed | Bottom nav (default tab) | Tap top-priority card | Dismiss/snooze a card, search, open notifications | Priority-ranked cards (see Journeys §Home logic) | New user / Active player / Unconfirmed result / Inactive player / Competitive player (see Document 3) | "You're all caught up — here's what to try next" (never truly empty; falls back to Discover prompts) | Standard, cached last-known feed shown with a banner if offline | Any pillar screen |
| Notification Centre | List of all notifications | Home bell icon, Profile | Tap notification → deep link | Mark all read, filter by type | Notification list | Standard | "No notifications yet" | Standard | Deep-links to relevant screen |
| Global Search | Cross-entity search (players/courts/clubs/competitions) | Home search bar | Select result | Filter by entity type | Query, results | Standard | "No results for '...'" with suggestion to broaden | Standard | Player/Court/Club/Competition detail |
| Quick Actions Sheet | Fast access to common actions | Home FAB | Find Players / Log Practice / Enter Result / Find Court | — | — | n/a | n/a | n/a | Respective flows |

### A.4 Play (Find, Challenge, Schedule, Matches, Results, History)

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Play Hub | Tab landing — segmented Find / Challenges / Active / History | Bottom nav | Select segment | — | Counts per segment | Standard | n/a | n/a | Sub-screens below |
| Player Search / Discovery | Find compatible opponents | Play Hub, Discover | Open player profile | Apply filters | Search results | Standard | "No players match these filters — try widening distance or level range" | Standard | Player Profile, Filters |
| Player Filters | Refine discovery | Player Search | Apply | Reset | Distance, level, availability, singles/doubles, social/competitive, club, courts | Standard | n/a | n/a | Player Search results |
| Player Profile (other player) | Evaluate a potential opponent | Search, connection, match, club member list | Connect / Challenge | Message (if connected), Block, Report | Photo, name, general location, club, hand, ratings, stats, recent form, match history, achievements, availability summary, development areas | Own profile vs. connected vs. not connected (gated fields) | n/a | Standard | Connect flow, Challenge flow |
| Connections List | Manage existing connections | Profile → Connections | Open a connection's profile | Remove connection | Connections list | Standard | "Connect with players to build your Tennis network" | Standard | Player Profile |
| Pending Requests | Incoming/outgoing connection requests | Connections List, Notification | Accept / Decline | View profile first | Requests list | Standard | "No pending requests" | Standard | Player Profile |
| Connection Request Sent | Confirms a request went out | Player Profile → Connect | Done | Cancel request | — | n/a | n/a | n/a | Player Profile |
| Block / Report Sheet | Safety action on a player | Player Profile, Chat | Confirm block/report | Cancel | Reason selection | Standard | n/a | Standard | Back to prior screen |
| Challenge Composer | Start a match challenge | Player Profile, Connections | Send Challenge | Add note | Opponent, format (singles/doubles) | Standard | n/a | Standard | Propose Time |
| Propose Time | Suggest date/time options | Challenge Composer | Send proposal | — | Date/time options | Standard | n/a | Standard | Challenge Status |
| Counter-Propose | Respond with alternate time | Challenge Status (recipient) | Send counter | Accept original instead | Alternate date/time | Round-limited (max 3 rounds) | n/a | Standard | Challenge Status |
| Suggest Court (in-challenge) | Attach a court to the match | Challenge Status | Suggest | Open full Court Finder | Court selection | Standard | n/a | Standard | Court Profile, Challenge Status |
| Challenge Status / Detail | Track a challenge's progress | Play Hub → Challenges, Notification | Accept / Counter / Decline / Confirm | Message opponent | Full challenge state | Proposed / Scheduling / Scheduled / Rescheduled / Cancelled / Expired | n/a | Standard | Match Detail (once Scheduled) |
| Match Detail (scheduled) | Full detail of an upcoming match | Home, Play Hub → Active | Enter Result (post-match), Get Directions | Reschedule, Cancel, Message opponent, Open Booking | Opponent, time, court, competition context | Scheduled / Rescheduled / Cancelled | n/a | Standard | Reschedule, Cancel, Enter Score |
| Reschedule | Change match time | Match Detail | Send new proposal | Cancel instead | New date/time | Standard | n/a | Standard | Challenge Status |
| Cancel Match | Cancel an upcoming match | Match Detail | Confirm cancel | Back | Cancellation reason (optional) | Standard | n/a | Standard | Play Hub → Active |
| Active Matches List | All in-progress/upcoming matches | Play Hub → Active | Open match | — | Matches list | Standard | "No upcoming matches — challenge someone to get started" | Standard | Match Detail |
| Enter Score | Record match result | Match Detail (post-match), Home | Submit | Report walkover/retirement instead | Set-by-set score | Standard + singles/doubles scoring model | n/a | Standard, duplicate-submission guard | Submit Confirmation |
| Submit Confirmation | Confirms score sent to opponent | Enter Score | Done | Edit before opponent reviews (grace window) | — | Awaiting opponent | n/a | n/a | Match Detail (Disputed-pending) |
| Opponent Review (Confirm/Dispute) | Opponent validates submitted score | Notification, Home | Confirm | Dispute | Submitted score | Standard | n/a | Standard | Match History (confirmed) or Dispute Detail |
| Dispute Detail | Resolve a disputed result | Opponent Review → Dispute, Notification | Submit your version | Escalate to club/platform | Both submitted versions | Disputed → Escalated → Resolved | n/a | Standard | Match History (once resolved) |
| Match History List | Past matches | Play Hub → History, Profile | Open match | Filter by competition/opponent/date | Match list | Standard | "Play your first match to start building history" | Standard | Match Detail (completed) |
| Match Detail (completed) | Full record of a finished match | Match History | — | Rematch (starts new Challenge), Share | Score, competition context, rating movement | Completed / Walkover / Retired | n/a | Standard | Match Reflection, Player Profile (opponent) |
| Match Reflection | Optional lightweight post-match reflection | Match Detail (completed), post-confirmation prompt | Save reflection | Skip | Confidence rating, notes | Standard | n/a | Standard | Skill Development (feeds signal) |

### A.5 Compete

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Compete Hub | Tab landing — segmented Leagues / Ladders / Tournaments / Events | Bottom nav | Select segment | Filter by sport (Padel chip if added) | Counts per segment | Standard | n/a | n/a | Sub-screens below |
| League Discovery / List | Browse available leagues | Compete Hub, Home recommendation | Open league | Filter by club/level/format | League list | Standard | "No leagues near you yet — try widening your search" | Standard | League Detail |
| League Detail | Full league information | League List | Register / Join Waitlist | View Rules, View Season | Description, dates, level, organizer | Draft / Registration Open / Registration Closed / Scheduled / Active / Completed / Cancelled | n/a | Standard | League Rules, Season Detail |
| League Rules | Format and scoring rules | League Detail | — | — | Rules text/structured format | Standard | n/a | Standard | League Detail |
| Season Detail | Current/past season for a league | League Detail | Register / Enter (if enrolled) | View Registered Players | Season dates, round count | Draft / Registration Open / Closed / Scheduled / Active / Completed / Cancelled | n/a | Standard | Registration, Round Detail, Standings |
| Registered Players List | Who's in this season | Season Detail | Open player profile | — | Player list | Standard | n/a | Standard | Player Profile |
| Registration / Waitlist | Join a season | Season Detail | Register | Join Waitlist (if full) | Player eligibility | Enrolled / Waitlisted | n/a | Standard, "registration closed" state | Season Detail |
| My Seasons | Seasons the player is enrolled in | Compete Hub, Profile | Open season | — | Enrolled seasons list | Standard | "You haven't joined a season yet" | Standard | Season Detail |
| Round Detail | Current round's opponent/fixture | Season Detail, Home | Contact opponent / Schedule | View full fixture list | Round number, opponent, deadline | Upcoming / Active / Closed | n/a | Standard | Challenge Composer (pre-filled), Fixture Card |
| Fixture Card Detail | A single scheduled/completed fixture within a round | Round Detail | Enter Result / View Result | — | Fixture participants, date, score | Scheduled / Played / Walkover / Retirement / No-show / Disputed / Cancelled / Expired | n/a | Standard | Enter Score, Match Detail |
| Standings | League/season leaderboard | Season Detail, Home | Open a player's profile | Filter by division | Ranked player list with W/L | Standard | "Standings appear once the first round is played" | Standard | Player Profile |
| Ladder Detail | Ladder-specific info and current position | Compete Hub → Ladders | Challenge next-ranked player | View full ladder | Ladder structure, player's position | Standard | n/a | Standard | Challenge Composer, Standings (ladder view) |
| Tournament Discovery / List | Browse tournaments | Compete Hub → Tournaments | Open tournament | Filter | Tournament list | Standard | "No tournaments open for registration right now" | Standard | Tournament Detail |
| Tournament Detail | Tournament information | Tournament List | Register | View Draw | Format, dates, entry fee, organizer | Draft / Registration Open / Closed / Scheduled / Active / Completed / Cancelled | n/a | Standard | Draw/Bracket, Registration |
| Draw / Bracket | Visual tournament bracket | Tournament Detail | Open a match in the bracket | — | Bracket structure, results as they complete | Pre-draw / Live / Completed | "Draw will be published once registration closes" | Standard | Match Detail |
| Event Discovery / List | Browse Tennis events (social, clinics, exhibitions) | Compete Hub → Events, Discover | Open event | Filter | Event list | Standard | "No events nearby yet" | Standard | Event Detail |
| Event Detail / Registration | Event info and RSVP | Event List | Register / RSVP | Add to calendar | Description, organizer, date, location | Open / Full-Waitlist / Closed | n/a | Standard | Organizer profile |
| Rankings | Broader ranking view (beyond a single league) | Compete Hub, Profile | Open a player's profile | Filter by region/level | Ranked list | Standard | "Rankings build up as more verified matches are played" | Standard | Player Profile |

### A.6 Discover (Courts, Clubs, Coaches)

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Court Finder Hub | Map/List toggle entry point | Bottom nav → Discover → Courts | Toggle Map/List | Search, filter | Court results | Standard | "No courts found in this area" | Standard, "maps unavailable" degraded state | Court Profile |
| Court Map | Map view with pins | Court Finder Hub | Tap pin → mini card → Court Profile | Recenter, cluster zoom | Court coordinates | Standard, pin clustering at zoom-out | Standard | Standard, graceful degrade to List if map tiles fail | Court Profile |
| Court Profile | Full court information | Court Map/List, Suggest Court (in-challenge) | Get Directions / Contact / Book | Save, Report/Update Info, View Photos | Address, map, photos, court count, surface, indoor/outdoor, lighting, amenities, hours, phone, website, booking info, Google Business data where available | Verified / Unverified badge | n/a | "Some details unavailable" partial-data state (never fabricated) | Court Photos, Report/Update Court Info, external booking handoff |
| Court Photos Gallery | Browse court photos | Court Profile | Swipe through | — | Photo set | Standard | "No photos yet" | Standard | Court Profile |
| Report / Update Court Info | Flag incorrect data | Court Profile | Submit correction | Cancel | Field-level correction | Standard | n/a | Standard | Court Profile (thank-you confirmation) |
| Booking Options Sheet | Choose how to book/contact | Court Profile | Call / WhatsApp / External Booking Link | Cancel | Available contact methods | Standard | "No booking info available — try contacting directly" | Standard | External booking handoff |
| External Booking Handoff | Hands off to external site/app | Booking Options Sheet | — (external) | Return to Drift | Booking URL | Opening external / Returned | Standard | Broken-link report prompt | Court Profile |
| Club Discovery / List | Browse clubs/communities | Discover → Clubs | Open club | Filter by distance | Club list | Standard | "No clubs nearby yet" | Standard | Club Profile |
| Club Profile | Club information and feed | Club List, Court Profile (linked club) | Join / Follow | View Coaches, View Courts, View Feed | Description, photos, amenities, courts, coaches, events | Member / Non-member view | n/a | Standard | Club Feed, Coach Profile, Court Profile |
| Coach Discovery / List | Browse coaches | Discover → Coaches | Open coach profile | Filter by specialisation/level/club | Coach list | Standard | "No coaches listed near you yet" | Standard | Coach Profile |
| Coach Profile | Coach detail and contact | Coach List, Club Profile | Contact / Book | View reviews (if enabled) | Bio, qualifications, experience, specialisations, availability, contact | Standard | n/a | Standard | External contact handoff |

### A.7 Learn (Learning, Skill Development, Practice, Goals, Progress)

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Learning Home | Entry to structured learning | Profile → Learn, Home recommendation | Browse a skill category | Search content | Categories, featured content | Standard | n/a | Standard | Skill Category Browse |
| Skill Category Browse | Content filtered by skill/level | Learning Home | Open lesson/drill | Filter by level | Content list | Standard | "No content yet for this filter" | Standard | Lesson Detail, Drill Detail |
| Lesson Detail | Structured lesson content | Skill Category Browse, Skill Detail recommendation | Mark Complete | Save for later | Text/steps, related drills | Standard | n/a | Standard | Video Lesson Player, Skill Detail |
| Video Lesson Player | Video-based lesson | Lesson Detail | Play/Pause | Mark Complete | Video asset | Buffering / Playing / Completed | n/a | Playback error + retry | Lesson Detail |
| Drill Detail | Structured practice drill | Skill Category Browse, Skill Detail recommendation | Log this drill in Practice | Save for later | Drill instructions, target skill | Standard | n/a | Standard | Add Practice Session |
| Training Plan Detail | Multi-step plan across sessions | Learning Home, Skill Detail recommendation | Start Plan | View steps | Plan structure, progress | Not started / In progress / Completed | n/a | Standard | Practice Log |
| Skill Profile | Full development breakdown | Profile → Skill Development, Home | Open a skill's detail | Retake Assessment | Serve/Forehand/Backhand/Return/Net Play/Movement/Match Play percentages | Directional (early data) vs. Established (rich data) — see Journeys §8 rule | n/a | Standard | Skill Detail, Assessment Retake |
| Skill Detail | Deep dive on one skill dimension | Skill Profile | View recommended drill/lesson | Set a Goal for this skill | Historical trend, contributing signals | Standard | "Not enough data yet — complete a few practice sessions or matches" | Standard | Drill/Lesson Detail, Create Goal |
| Assessment Retake | Re-run the adaptive assessment later | Skill Profile, Settings | Start | Cancel | Same adaptive engine as onboarding | Standard | n/a | Standard | Suggested Level Review (updated) |
| Practice Log List | History of logged sessions | Profile → Practice, Learning Home | Open session, Add new | Filter by skill/date | Session list | Standard | "Log your first practice session" | Standard | Add Practice Session |
| Add Practice Session | Lightweight logging form | Practice Log List, Drill Detail | Save | Cancel | Date, duration, skill focus, drill, notes, perceived performance | Standard | n/a | Standard, offline-queue-and-sync | Practice Log List |
| Goal List | All active/past goals | Profile → Goals, Skill Detail | Open goal, Create new | Filter by status | Goals list | Standard | "Set your first development goal" | Standard | Goal Detail, Create Goal |
| Create Goal | Set a skill-specific target | Goal List, Skill Detail | Save | Cancel | Skill, target, deadline, milestones | Standard | n/a | Standard | Goal Detail |
| Goal Detail | Track a single goal's progress | Goal List | Log progress / Mark complete | Edit, Delete | Target, current progress, milestones | On track / Behind / Achieved | n/a | Standard | Progress Report |
| Progress Report | Aggregated improvement view over time | Profile → Progress, Home | Export/Share (P1) | Filter by date range | Trend charts across skills | Standard | "Your progress report builds up as you play and practice" | Standard | Assessment History |
| Assessment History | Past assessment results over time | Progress Report, Skill Profile | Open a past assessment | — | Historical suggested levels | Standard | "Only one assessment so far" | Standard | Skill Profile |

### A.8 Follow (News)

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| News Feed | Categorised Tennis news | Bottom nav overflow / Home / Profile | Open story | Filter by category, Follow topic | Story cards | Standard | "No stories in this category yet" | Standard, stale-cache-with-banner if ingestion is down | News Story Detail |
| News Story Detail / Highlight | Headline + platform summary + attribution | News Feed | Open Original Source | Save, Share | Headline, publisher, image, highlight, date, category, source | Standard | n/a | Standard, "source unavailable" if link breaks | External browser (publisher site) |
| Saved Stories | Bookmarked stories | Profile, News Feed | Open story | Remove | Saved list | Standard | "Save stories to read later" | Standard | News Story Detail |

### A.9 Connect (Messaging, Community, Achievements)

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Inbox | All conversations | Profile → Messaging | Open thread | Search | Conversation list | Standard | "No conversations yet — connect with a player to start one" | Standard | Chat Thread |
| Chat Thread | Direct conversation, incl. match system messages | Inbox, Match Detail, Player Profile | Send message | Quick actions (Propose Time, Confirm, etc. — see Journeys §4.2), Report/Block | Messages, system events | Standard, unread badge | "Say hello" | Standard, offline queue-and-retry | Match/Challenge screens (via quick actions) |
| System Message Detail | Expand a system-generated event in-thread | Chat Thread | Tap to view related match/competition | — | Linked entity reference | Standard | n/a | Standard | Match Detail, League Detail |
| Club Feed | Community conversation for a joined club | Club Profile, Profile → Community | Post (if permitted) | React | Feed posts | Standard | "No posts yet" | Standard | Announcements |
| Announcements | Official club/competition announcements — separate from Club Feed conversation | Club Profile, Notification | Open announcement | — | Announcement content | Standard | "No announcements yet" | Standard | Club Feed |
| Community Report Sheet | Report a post/message/user in a community context | Club Feed, Announcements | Submit report | Cancel | Reason selection | Standard | n/a | Standard | Back to prior screen |
| Achievements List | Earned and available achievements | Profile → Achievements | Open achievement detail | — | Achievement set with rules | Earned / Locked (with transparent criteria) | n/a | Standard | Profile |

### A.10 Profile, My Sports, Padel, Settings

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Own Profile | Player's own Tennis identity | Bottom nav | Edit Profile | View Ratings & Stats, View Achievements | Full Tennis Profile | Standard | n/a | Standard | Edit Profile, Ratings & Stats Detail, Achievements |
| Edit Profile | Update profile fields | Own Profile | Save | Cancel | Name, photo, hand, bio | Standard | n/a | Standard | Own Profile |
| Ratings & Stats Detail | Deep-dive on singles/doubles rating and stats | Own Profile, Player Profile (other) | — | Filter by period | Rating history, W/L, recent form | Standard | n/a | Standard | Match History |
| My Sports Hub | Sport-profile switcher (profile-level, not global nav) | Own Profile | Open Tennis Profile / Open Padel Profile | + Add Padel (if not added) | Tennis card (always), Padel card (if added) | Tennis-only / Tennis+Padel | n/a | Standard | Padel Profile, Add Padel flow |
| Add Padel — Assessment | Separate adaptive Padel assessment (mirrors §3 logic, Padel dimensions) | My Sports Hub → + Add Padel | Answer question → auto-advance | Back | Padel behavioural answers | Beginner/Foundational/Intermediate/Advanced branch | n/a | Standard | Padel Profile (generated) |
| Padel Profile | Padel-specific identity | My Sports Hub | Edit preferences | View Match History/Stats | Padel rating, skill profile, preferences, goals, achievements | Standard | n/a | Standard | Padel Match History, Padel Preferences & Goals |
| Padel Match History & Stats | Padel-specific match record | Padel Profile | Open match | Filter | Padel match list | Standard | "Play your first Padel match to start building history" | Standard | Match Detail (Padel-scoped) |
| Padel Preferences & Goals | Padel-specific preferences and goals | Padel Profile | Save | — | Preferred side, partner preferences, goals | Standard | n/a | Standard | Padel Profile |
| Settings Home | Entry to all settings | Profile | Open a setting | — | — | n/a | n/a | n/a | Sub-screens below |
| Privacy Settings | Control visibility of profile fields | Settings Home | Save | — | Field-level visibility toggles | Standard | n/a | Standard | Settings Home |
| Notification Preferences | Per-category notification control | Settings Home | Save | — | Notification matrix (see Document 6) | Standard | n/a | Standard | Settings Home |
| Blocked Users | Manage blocked players | Settings Home | Unblock | — | Blocked list | Standard | "You haven't blocked anyone" | Standard | Settings Home |
| Subscription / Plan | View/change plan | Settings Home | Upgrade / Downgrade | View billing history | Current plan, entitlements | Free / Premium | n/a | Standard | Payments screens (§Payments) |
| Account & Security | Password, linked accounts, sessions | Settings Home | Change Password | Log out other sessions | Security settings | Standard | n/a | Standard | Settings Home |
| Help / FAQ | Self-serve support content | Settings Home | Search FAQ | — | FAQ content | Standard | "No results for your search" | Standard | Contact Support |
| Contact Support | Reach human support | Help/FAQ, Settings Home | Submit request | — | Message, category | Standard | n/a | Standard | Help/FAQ |
| Terms / Privacy Policy | Legal content | Settings Home | — | — | Static legal text | Standard | n/a | Standard | Settings Home |
| Delete Account | Account deletion with confirmation | Settings Home | Confirm deletion | Cancel | Deletion reason (optional) | Confirming → Processing → Deleted | n/a | Standard | Welcome (post-deletion) |

### A.11 Payments

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Upgrade / Plan Selection | Choose a paid tier | Subscription/Plan, feature paywall prompt | Select plan → Pay | Compare plans | Plan tiers, pricing | Standard | n/a | Standard | Payment Method |
| Payment Method | Add/manage payment method | Upgrade flow, Subscription/Plan | Save method | Remove method | Card/mobile-money details (tokenised, provider-agnostic) | Standard | "No payment method saved" | Payment failure with specific reason, retry | Billing History |
| Billing History | Past charges and receipts | Subscription/Plan | View receipt | Download (P1) | Transaction list | Standard | "No billing history yet" | Standard | Payment Method |

### A.12 Help & Support

*(Covered under A.10 — Help/FAQ and Contact Support — listed here for category completeness per the requested inventory grouping; no additional unique screens.)*

**Mobile screen count: 123**

---

## PART B — Club / Community Admin (Next.js — deferred build phase)

*Documented for ecosystem coherence per Document 1; not part of the mobile-first build sequence. Desktop/laptop-first responsive rules apply (Document 5).*

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Admin Login | Authenticate | Direct URL | Log in | Forgot password | Credentials | Standard | n/a | Standard | Dashboard or Organization Setup |
| Accept Invitation | Onboard an invited admin | Email invite link | Accept & set password | — | Invitation token | Standard | n/a | Expired/invalid invite handling | Organization Setup |
| Organization Setup | Create/claim a club | Post-invite (first admin), self-service | Create club | — | Club name, type | Standard | n/a | Standard | Club Profile (Settings) |
| Dashboard / Overview | Club activity summary | Post-login default | Open a flagged item | View full reports | Activity summary, upcoming events, member growth, court engagement, tasks/alerts | Standard | "Your dashboard fills in as members join and activity begins" | Standard | Members, Competitions, Reports |
| Member List | All club members | Dashboard, nav | Open member, Invite | Filter/search, bulk actions | Member list | Standard | "Invite your first members to get started" | Standard | Member Detail, Invitations |
| Member Detail | Single member's club record | Member List | Change role, Remove | View player's Tennis Profile (read-only) | Membership status, role, join date | Active / Pending / Suspended | n/a | Standard | Roles & Permissions |
| Invitations | Send/track member invites | Member List | Send invite | Resend, Revoke | Email/phone, status | Sent / Accepted / Expired | "No pending invitations" | Standard | Member List |
| Roles & Permissions | Define admin role assignments | Member Detail, nav | Assign role | — | Role matrix (Owner/Admin/Competition Manager/Coach/Content Manager/Read-only) | Standard | n/a | Standard | Member Detail |
| Approval Requests | Pending member/coach applications | Dashboard, Member List | Approve / Reject | View applicant profile | Application queue | Standard | "No pending approvals" | Standard | Member List |
| League List | All club-run leagues | Nav → Competitions | Open league, Create new | Filter by status | League list | Standard | "Create your first league" | Standard | League Create/Edit |
| League Create / Edit | Configure a league | League List | Save & Publish | Save as Draft | Name, format, rules, dates | Draft / Registration Open / Closed / Scheduled / Active / Completed / Cancelled | n/a | Validation errors (overlapping dates, missing rules) | Season Setup |
| Season Setup | Configure a season within a league | League Create/Edit, League Detail | Save & Open Registration | — | Season dates, round count, format | Standard | n/a | Standard | Registration & Waitlist |
| Registration & Waitlist | Manage who's registered | Season Setup, nav | Approve/remove registrant | Manage waitlist order | Registrant list | Standard | "No registrations yet" | Standard | Fixtures |
| Fixtures (Generate/Edit) | Create and adjust round fixtures | Season Setup, nav | Auto-generate round | Manually edit a fixture | Fixture list per round | Draft / Published | "Generate fixtures once registration closes" | Standard, conflict warnings (double-booked player) | Result Review |
| Result Review | Review/approve submitted results | Fixtures, Disputes Queue, nav | Approve | Flag for dispute review | Submitted scores | Pending / Approved / Disputed | "No results awaiting review" | Standard | Standings |
| Disputes Queue | Resolve escalated match disputes | Result Review, nav | Rule on dispute | Request more info from players | Both parties' submitted versions | Open / Resolved | "No open disputes" | Standard | Result Review |
| Standings | Admin view of league/season standings | Season Setup, nav | Manual override (audited) | Export | Ranked table | Standard | "Standings appear after the first round" | Standard | Result Review |
| Rules & Scoring Config | Define competition rules/format | League Create/Edit | Save | — | Scoring format, walkover rules, unfinished-match policy | Standard | n/a | Standard | League Detail (mobile-facing) |
| Season Archive / Awards | Closed seasons and any awards issued | League List, nav | View archived season | Issue an award | Historical seasons | Completed / Cancelled | "No completed seasons yet" | Standard | Standings (historical) |
| Ladder Management | Configure and monitor a ladder | Nav → Competitions | Create ladder | Adjust positions (exception handling) | Ladder structure, current positions | Standard | "Create your first ladder" | Standard | Member List |
| Tournament List | All club tournaments | Nav → Competitions | Open, Create new | Filter | Tournament list | Standard | "Create your first tournament" | Standard | Tournament Create/Edit |
| Tournament Create / Edit | Configure a tournament | Tournament List | Save & Publish | Save as Draft | Format, draw size, dates, entry fee | Draft / Registration Open / Closed / Scheduled / Active / Completed / Cancelled | n/a | Validation errors | Draw Management |
| Draw Management | Seed and manage the bracket | Tournament Create/Edit | Generate draw | Manually adjust seeding | Bracket structure | Pre-draw / Live / Completed | "Generate the draw once registration closes" | Standard | Result Review |
| Events Calendar | All club events | Nav → Events | Open event, Create new | Filter by date | Event list, calendar view | Standard | "No events scheduled" | Standard | Create/Edit Event |
| Create / Edit Event | Configure an event | Events Calendar | Save & Publish | Save as Draft | Name, date, description, capacity | Standard | n/a | Standard | Attendees & Registrations |
| Attendees & Registrations | Who's registered for an event | Create/Edit Event, Events Calendar | Mark attendance | Export list | Registrant list | Standard | "No registrations yet" | Standard | Events Calendar |
| Court List | All club-managed courts | Nav → Courts | Open court, Add new | Filter | Court list | Standard | "Add your first court" | Standard | Add/Edit Court |
| Add / Edit Court | Configure court details | Court List | Save | — | Name, surface, amenities, hours, photos, Google profile link | Standard | n/a | Standard, photo upload failure retry | Availability & Maintenance |
| Availability & Maintenance Notices | Post court closures/maintenance | Court List, Add/Edit Court | Post notice | Remove notice | Notice text, affected dates | Active / Expired | "No active notices" | Standard | Court List (mobile-facing badge) |
| Booking Management | Track/manage court bookings if native booking is enabled | Court List | Approve/adjust booking | — | Booking requests | Standard | "No bookings yet" | Standard | Court List |
| Coach List | All club-affiliated coaches | Nav → Coaches | Open coach, Add new | Filter | Coach list | Standard | "Add your first coach" | Standard | Add/Edit Coach |
| Add / Edit Coach | Configure coach profile | Coach List | Save | — | Bio, qualifications, specialisations, availability | Standard | n/a | Standard | Coach List |
| Announcements | Post official club announcements | Nav → Community | Publish | Save as draft, Pin | Announcement content | Draft / Published / Pinned | "No announcements yet" | Standard | Mobile Club Feed (read side) |
| Moderation Queue | Review flagged community content | Nav → Community | Approve / Remove | Escalate to Platform Admin | Flagged posts/messages | Pending / Resolved | "Nothing pending review" | Standard | Community Report Sheet (mobile, upstream) |
| Media Library | Manage club photos/assets | Nav → Community, Club Profile | Upload | Delete | Asset list | Standard | "Upload your first photo" | Standard, upload failure retry | Club Profile, Court Profile |
| Engagement Reports | Member/competition engagement metrics | Nav → Reports | Export | Filter by period | Engagement charts | Standard | "Reports build up as activity accrues" | Standard | Dashboard |
| Court Inquiry Reports | How often/which courts get viewed/contacted | Nav → Reports | Export | Filter | Court engagement metrics | Standard | Standard | Standard | Court List |
| Event Reports | Attendance/turnout metrics | Nav → Reports | Export | Filter | Event metrics | Standard | Standard | Standard | Events Calendar |
| Member Export | Download member data | Nav → Reports | Export CSV | — | Member dataset | Standard | n/a | Export failure retry | Member List |
| Club Profile (Settings) | Public-facing club info | Nav → Settings | Save | Submit Verification Request | Photos, amenities, hours, booking contacts, Google profile link | Unverified / Pending / Verified | n/a | Standard | Platform Admin verification workflow |
| Notification Settings | Club-level notification config | Nav → Settings | Save | — | Notification defaults for members | Standard | n/a | Standard | Settings |
| Billing / Subscription | Club's own platform subscription | Nav → Settings | Upgrade / Manage | View invoices | Plan, billing history | Standard | n/a | Standard | Payments (Platform Admin commercial module, upstream) |
| Team Roles | Admin team management (distinct from player Roles & Permissions) | Nav → Settings | Invite admin, change role | Remove admin | Admin team list | Standard | n/a | Standard | Invitations |
| Audit Log | Consequential-action history | Nav → Settings | Filter by action/user | Export | Audit entries | Standard | "No audited actions yet" | Standard | — |

**Club Admin screen count: 44**

---

## PART C — Platform Admin Dashboard (Next.js — deferred build phase)

*Documented for ecosystem coherence per Document 1; not part of the mobile-first build sequence.*

| Screen | Purpose | Entry Point | Primary Action | Secondary Actions | Data | States | Empty | Error | Connects To |
|---|---|---|---|---|---|---|---|---|---|
| Admin Login | Authenticate internal user | Direct URL | Log in | Forgot password | Credentials | Standard | n/a | Standard | 2FA Verification |
| 2FA Verification | Second factor | Post-login | Enter code | Resend | Code | Standard | n/a | Invalid/expired code | Overview Dashboard |
| Role Management | Define internal role types | Nav → Access & Control | Create/edit role | — | Role definitions | Standard | n/a | Standard | Permission Matrix |
| Team Users | Internal staff accounts | Nav → Access & Control | Invite staff, assign role | Suspend | Staff list | Standard | "Invite your first team member" | Standard | Role Management |
| Permission Matrix | Least-privilege access map | Nav → Access & Control | Edit permissions | — | Role × module grid | Standard | n/a | Standard | Role Management |
| Platform KPI Dashboard | Activation/engagement/retention/revenue headline metrics | Post-login default | Drill into a metric | Change date range | KPI set (see Document 1 success metrics) | Standard | "Data populates as the platform launches" | Standard | Growth Analytics, Revenue Dashboard |
| Market / City Dashboard | Per-market breakdown | Nav → Overview | Select a market | Compare markets | Per-city metrics | Standard | "No markets configured yet" | Standard | Configuration → Countries/Cities |
| Growth Analytics | Funnels and cohort growth | Nav → Overview | Drill into a funnel step | Export | Event-driven funnels (Document 6) | Standard | Standard | Standard | — |
| Revenue Dashboard | Subscription/commission revenue | Nav → Overview | Drill into a revenue line | Export | Revenue by source | Standard | "No revenue recorded yet" | Standard | Commercial module |
| System Health | API/infra status | Nav → Overview | Acknowledge an incident | — | Service status, latency, error rates | Healthy / Degraded / Down | n/a | n/a | Support Tickets |
| User List | All platform users | Nav → Users | Open user | Filter/search, bulk actions | User list | Standard | n/a | Standard | User Detail |
| User Detail | Single user's full record | User List | Suspend/Restore | View activity, view flags | Profile, Tennis/Padel profiles (read-only), account status | Active / Suspended / Deleted | n/a | Standard | Player Activity, Flags/Reports |
| Player Activity | Usage timeline for one user | User Detail | — | Filter by event type | Event history (Document 6 taxonomy) | Standard | "No recorded activity" | Standard | User Detail |
| Flags / Reports | Reports filed against a user | User Detail, Trust & Safety | Review, action | Dismiss | Report details | Open / Actioned / Dismissed | "No reports on this user" | Standard | Suspend/Restore |
| Support Notes | Internal notes on a user | User Detail | Add note | — | Note history | Standard | "No notes yet" | Standard | User Detail |
| Suspend / Restore | Account status action | User Detail | Confirm suspend/restore | Add reason (required, audited) | Status, reason | Standard | n/a | Standard | Audit Logs |
| Venue Database | All courts/venues platform-wide | Nav → Venues | Open venue, Add new | Filter, bulk actions | Venue list | Standard | n/a | Standard | Add/Edit Venue |
| Add / Edit Venue | Configure venue record | Venue Database | Save | — | Full court/venue fields | Standard | n/a | Standard | Google Places Sync Status |
| Google Places Sync Status | Integration health for venue enrichment | Venue Database, nav | Force re-sync | View sync errors | Sync status per venue | Synced / Stale / Failed | n/a | Standard | Add/Edit Venue |
| Verification Workflow | Approve club-submitted venue verification requests | Venue Database, Club Admin Club Profile (upstream) | Approve / Reject | Request more info | Verification submission | Pending / Approved / Rejected | "No pending verifications" | Standard | Venue Database |
| Duplicate Merge | Resolve duplicate venue records | Venue Database | Merge | Mark as distinct | Candidate duplicate pairs | Standard | "No duplicates detected" | Standard | Venue Database |
| Club List | All clubs/communities | Nav → Organizations | Open club | Filter | Club list | Standard | n/a | Standard | Club Detail |
| Club Detail | Single club's platform-level record | Club List | Approve/suspend | View subscription | Club profile (read/write at platform level) | Standard | n/a | Standard | Admin Approvals, Subscription Status |
| Admin Approvals | Approve new club admin/owner requests | Club Detail, nav | Approve / Reject | — | Pending admin requests | Standard | "No pending approvals" | Standard | Club Detail |
| Subscription Status | Club's platform subscription state | Club Detail, nav | Adjust plan (support override) | — | Plan, status, renewal | Active / Past Due / Cancelled | n/a | Standard | Commercial module |
| Community Moderation | Platform-level oversight of club community content | Club Detail, Trust & Safety | Review escalated content | Action | Escalated items from Club Admin moderation queue | Standard | "Nothing escalated" | Standard | Club Admin Moderation Queue (upstream) |
| Global Competitions | Cross-club competition oversight | Nav → Competitions | Open competition | Filter | Competition list platform-wide | Standard | n/a | Standard | Rulesets |
| Rulesets | Manage reusable/standard rule templates | Global Competitions, nav | Create/edit ruleset | — | Ruleset definitions | Standard | n/a | Standard | Global Competitions |
| Disputes / Escalations | Platform-level dispute resolution (no club context, or club escalated further) | Nav → Competitions | Rule on dispute | — | Escalated disputes | Open / Resolved | "No open escalations" | Standard | Audit Logs |
| News Source Manager | Configure approved RSS/API news sources | Nav → Content | Add/pause source | Edit source config | Source list | Active / Paused / Blocked | "Add your first news source" | Standard | Ingestion Logs |
| Ingestion Logs | News pipeline run history | News Source Manager, nav | Retry failed run | View error detail | Job run history | Success / Failed / Partial | "No runs yet" | Standard | Story Moderation |
| Story Moderation | Review stories before/after publish | Ingestion Logs, nav | Approve / Reject / Edit summary | Tag topics | Ingested story queue | Pending / Published / Rejected | "No stories awaiting review" | Standard | Topic Tagging |
| Topic Tagging | Assign topics/players/tournaments to stories | Story Moderation | Save tags | — | Tag taxonomy | Standard | n/a | Standard | Story Moderation |
| Blocked Sources | Sources excluded from ingestion | News Source Manager, nav | Unblock | — | Blocked list | Standard | "No blocked sources" | Standard | News Source Manager |
| Content Library | Core lesson/drill/plan catalogue | Nav → Content | Open item, Create new | Filter by skill/level | Content list | Standard | "Create your first lesson" | Standard | Create Lesson, Create Drill |
| Create Lesson | Author a lesson | Content Library | Save & Publish | Save as Draft | Text/video, target skill/level | Draft / Published | n/a | Standard, video upload failure retry | Content Library |
| Create Drill | Author a drill | Content Library | Save & Publish | Save as Draft | Instructions, target skill | Draft / Published | n/a | Standard | Content Library |
| Skill Category / Learning Path Builder | Organise content into paths by skill/level/goal | Content Library, nav | Save path | Reorder | Path structure | Draft / Published | "Build your first learning path" | Standard | Content Library |
| Plans | Subscription plan definitions | Nav → Commercial | Create/edit plan | — | Plan tiers, pricing, entitlements | Standard | n/a | Standard | Invoices/Payments |
| Invoices / Payments | Transaction ledger | Nav → Commercial | View transaction | Refund (audited) | Transaction list | Standard | "No transactions yet" | Standard, payment-provider sync failure | Revenue Dashboard |
| Promotions | Promo codes / discounts | Nav → Commercial | Create promo | Deactivate | Promo definitions | Active / Expired | "No active promotions" | Standard | Plans |
| Sponsors / Ads | Sponsored placements (if enabled) | Nav → Commercial | Create placement | Deactivate | Placement config | Active / Scheduled / Ended | "No active sponsorships" | Standard | — |
| Reported Content Queue | All flagged content platform-wide | Nav → Trust & Safety | Review, action | Escalate priority | Flagged items (users, messages, posts, courts) | Pending / Actioned / Dismissed | "Nothing pending review" | Standard | User Detail, Community Moderation |
| Block / Abuse Cases | Pattern-level abuse tracking (repeat offenders) | Trust & Safety, User Detail | Escalate to suspension | Close case | Case history | Open / Closed | "No open cases" | Standard | Suspend/Restore |
| Countries / Cities | Configure supported markets | Nav → Platform | Add market | Deactivate market | Market list | Active / Coming Soon / Inactive | "Add your first market" | Standard | Market/City Dashboard |
| Feature Flags | Toggle features per market/cohort | Nav → Platform | Toggle flag | Set rollout percentage | Flag list | On / Off / Partial rollout | n/a | Standard | — |
| Notification Templates | Manage push/email/SMS templates | Nav → Platform | Edit template | Preview | Template content | Draft / Live | n/a | Standard | — |
| System Settings | Global configuration | Nav → Platform | Save | — | Global config values | Standard | n/a | Standard | — |
| API / Integration Settings | Manage third-party integration config (Maps, Places, news APIs, payment providers) | Nav → Platform | Update credentials/config | Test connection | Integration config | Connected / Disconnected / Error | n/a | Standard, connection test failure detail | System Health |
| Audit Logs | Full consequential-action history platform-wide | Nav → Platform | Filter by user/action/date | Export | Audit entries | Standard | "No audited actions yet" | Standard | — |
| Support Tickets | Internal support queue | Nav → Support | Open ticket, respond | Assign, close | Ticket list | Open / Assigned / Resolved | "No open tickets" | Standard | User Detail |
| Privacy Requests | Data export/deletion requests (compliance) | Nav → Support | Process request | — | Request queue | Pending / Fulfilled | "No pending privacy requests" | Standard | User Detail |

**Platform Admin screen count: 52**

---

## Summary

| App | Screens |
|---|---|
| Mobile (Flutter) | 123 |
| Club / Community Admin (Next.js) | 44 |
| Platform Admin (Next.js) | 52 |
| **Total** | **219** |

---
*Previous: [`03-user-journeys.md`](./03-user-journeys.md) · Next: [`05-design-system.md`](./05-design-system.md)*
