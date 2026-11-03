# Making Learn useful for tennis improvement

**Status:** Product and UX proposal, not an implementation record  
**Written:** 3 November 2026  
**Evidence:** [Android emulator walkthrough](../audit/learn-experience-2026-11-03/report.md), [Learning journey](../foundation/03-user-journeys.md), [screen inventory](../foundation/04-screen-inventory.md)

## Product outcome

A player should be able to answer three questions after using Learn:

1. What should I practise next, and why?
2. Did my last session produce a useful result?
3. Am I moving toward my goal, and what should I change?

The experience should be a loop: **focus skill → recommended activity → practice result → credible feedback → next activity**. Skill Profile, Practice Log, Goals, and Progress Report are four views of that same loop, not four separate record stores.

### Current evidence

The emulator walkthrough created a 30-minute Backhand session rated “Good” and a Backhand target of 4.0/6. The saved log showed a 3/5 feeling, the goal displayed “On track” at its unchanged 3.0/6 baseline, and the report showed a bar without explaining progress. The Backhand Consistency Drill gave useful instructions and opened a preselected Backhand log, but the log did not retain the drill name or ask for the clean-contact streak. A Skill Profile card showed Backhand at 50% without explaining the signal or warning icon; opening its detail returned “Not available” in the walkthrough.

There are useful foundations: content can be recommended for a weak skill, `PracticeSession` already has an optional `drillId`, and lesson/drill details have distinct actions. The work should build on those connections and keep logging short.

## Experience specification

### Learn entry: one next action

- Place one **Recommended next session** card above the four destination links. It names the focus skill, the activity, duration, and a plain reason: “Backhand is your current focus. Try the 12-minute consistency drill.”
- Prioritize an active goal's skill when there is one; otherwise use the weakest supported skill. When evidence is too thin, say why an introductory drill or assessment is suggested instead of claiming a diagnosed weakness.
- The card opens the actual published lesson/drill. If none exists, offer an assessment or a simple practice log action; do not show a dead recommendation.
- Keep Skill Profile, Practice Log, Goals, and Progress Report reachable as secondary destinations.

### Skill Profile: decide what to practise

- Each skill row should show its **state**, the source and freshness of that state, and one next action. Example: “Backhand · Early signal from one assessment and one practice · Try consistency drill.”
- Distinguish **assessment estimate**, **self-reported practice feeling**, and **observed drill result**. Do not present their blend as an objective measure of tennis ability. A precise percentage is especially misleading with one entry.
- Explain the 0–6 scale and the weakest-skill marker in context. For skills with no evidence, show “No data yet” plus `Assess this skill` or `Log a first session`.
- The skill detail should join the player's recent sessions, active goal, recommendation, and reason for the recommendation. An API failure needs retry; lack of data needs a useful empty state. Do not use the same generic “Not available” message for both.
- Recommendations and assessment retake must be discoverable without scrolling past eight full skill cards; use a focused first card or compact list.

### Practice Log: capture a result and improve the next session

- Preserve the current quick flow: date, skill, duration, feeling, optional reflection.
- When entering from a drill, carry its ID and title into the form. Preselect the skill, show “Logging Backhand Consistency Drill,” and attach the session to that drill on save. The existing API accepts `drillId`; verify that the mobile request sends it.
- For a drill with a measurable outcome, ask **one drill-specific result**. For the current Backhand drill: “Best clean-contact streak out of 20.” Keep this optional so a player can still log an incomplete session. A generic notes field is not a substitute for comparable results.
- Add one brief forward-looking prompt: “What will you try next time?” Do not require a long journal entry.
- After save, confirm what was recorded, show the previous comparable result when available, and offer `Repeat this drill`, `View goal`, or `Choose next activity`. If there is only one result, say that it is a starting point, not improvement.
- In the list, show the drill/result when present. Distinguish “felt good” from “performed better.” Provide a visible `Log practice` button in the empty state instead of relying on an icon-only add action.

### Goals: pair a target with a repeatable plan

- Offer a suggested goal based on a supported baseline, but let the player edit it. Example: “Improve Backhand from 3.0 to 4.0” paired with “Two focused sessions per week for four weeks.” Explain what the score does and does not measure.
- A goal needs an **outcome target** and a **next behavior**. A suggested drill and a modest practice frequency make the target actionable. A deadline may remain optional, but pace labels require enough information to judge pace.
- Goal detail should show baseline/current/target with dates, linked sessions, best comparable result, planned frequency, and a prominent `Log progress` or `Start recommended drill` action. Manual milestones can remain but should not be the only plan.
- Replace automatic `On track` when there is no deadline, current score, or measurable progress with a neutral state such as `Not started` or `No progress recorded yet`. Use `On track` only when the player's recorded evidence supports the pace. Never infer progress merely from creating a goal.
- Keep manual `Mark Complete` for goals that cannot be verified automatically, but ask for a short completion reason and show that completion was self-reported. If a score reaches the target, explain the contributing evidence before saying the goal was achieved.

### Progress Report: explain the change and its limits

- Lead with a sentence, not a bar: “One Backhand practice logged. It is too early to tell whether you are improving.” Then suggest the next comparable activity.
- With repeated evidence, show baseline versus current with dates, the result series for the same drill, practice frequency, and the active goal's movement. Let the player open the entries behind a claim.
- Keep separate views for **activity** (sessions), **self-report** (feeling), and **performance evidence** (drill result or assessment). These may move in different directions; do not collapse them into one unexplained trend.
- State what changed and what likely contributed, but avoid causal claims the data cannot support. If there are no comparable outcomes, say so.
- Assessment History should explain when another assessment would be useful. Do not prompt an immediate retake solely to populate a chart.

## Data and integrity decisions

These are implementation decisions to resolve before building charts or status labels:

1. **Skill score meaning.** `backend/src/learning/skill-score.ts` currently blends an assessment baseline (60%) with average practice feeling (40%), normalizes 1–5 feeling to 0–6, and labels the score `ESTABLISHED` after one practice entry. Decide whether to keep that formula as an explicitly labeled *self-report development signal* or replace it with a score that uses repeated objective results. In either case, include source, sample count, and last update in API/UI. Do not imply the number is a coached skill grade.
2. **Goal status.** The same file currently returns `ON_TRACK` when there is no deadline or current score. Introduce a neutral state and document the exact minimum evidence for `ON_TRACK`, `BEHIND`, and `ACHIEVED`. Preserve baseline snapshot behavior. A new goal at its baseline must not read as progress.
3. **Drill result storage.** `PracticeSession` has `drillId` and notes but no structured result. Add a small, versioned outcome definition to supported drills and a result value on sessions, or an equivalent typed schema. Only compare results with the same definition and unit. The first supported result can be `best clean-contact streak (0–20)` for Backhand Consistency Drill. Older sessions and drills without a result remain valid.
4. **Goal linkage.** A session should be associated with a relevant active goal by a clear rule or an explicit choice. Do not count unrelated sessions toward a goal. The UI must reveal which sessions support a goal.
5. **History.** A current score alone cannot substantiate a trend. Store or derive dated score snapshots and retain the inputs used to explain each change. Do not draw a time chart by repeating today's score for past dates.
6. **Completion.** `LearningContentCompletion` is intentionally excluded from the skill score. Keep “read/finished content” separate from “practised/improved.”

## Suggested delivery slices

| Slice | Scope | User-visible acceptance |
| --- | --- | --- |
| 1. Trust and recovery | Neutral goal status; score/source explanation; useful empty and error states; visible add actions | A just-created goal at baseline does not say “On track.” A player can tell what a skill score is based on and recover from a failed skill-detail load. |
| 2. Connected Backhand loop | Learn next-action card; Backhand drill → log retains `drillId`; structured streak result; log and goal show it | A player starts the real drill from Learn, logs a streak, and sees that same entry on the log and goal. The first result is described as a baseline. |
| 3. Feedback over time | Compare repeated same-drill results; progress explanation; next recommendation | After two comparable sessions, the report accurately describes the direction and links to both records. Sparse data still gets honest copy. |
| 4. Broader content | Extend typed outcomes to additional drills, adapt recommendation rules, add research findings | Each added drill has an outcome meaningful to its instructions; generic lessons are not forced into a fake performance metric. |

## Research and success checks

Before scaling the pattern, observe 5–8 beginner/intermediate players using the Backhand loop. Ask them to choose a focus, log a drill outcome, interpret their goal status, and say what they would do next. Note where they confuse *feeling* with *skill* and whether the status feels credible. This is validation work, not a claim that the walkthrough already proved benefit.

Track the share of goal creators who start a linked drill, log a result within seven days, return for a second comparable session, and improve or learn something useful from the comparison. Also ask whether the recommendation and progress explanation helped them decide their next session. Screen views and raw log counts alone do not show learning value.

## Boundaries

Keep the log fast and optional where possible. Do not gate general tennis learning on assessments or a goal. Do not fabricate improvement from a single session, self-reported feeling, or lesson completion. Continue to support existing practice entries and goals during any data migration. This proposal does not imply that the backend or mobile UI has already been changed.
