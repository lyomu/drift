# Learn experience: expert walkthrough

**Date:** 3 November 2026  
**Context:** Android emulator, signed in as the local demo player. I walked through Learn, Skill Profile, Backhand content, Practice Log, Goals, Progress Report, and Assessment History. I created one Backhand practice entry (30 minutes, “Good”) and one Backhand goal (4.0/6) to test the loop. This is an expert review of one account, not user interview research or a longitudinal outcome study.

## Verdict

The pieces for a useful training loop exist, but the current experience delivers mostly **record keeping and status display**. A player can find a drill, log practice, and create a goal; the screens rarely explain what to do next, whether the practice helped, or what evidence would move the goal. The most serious trust issue is that a new goal with no deadline and no improvement is labeled “On track.”

The product promise should be: **identify one skill to improve → recommend a concrete activity → capture an observable result → show what changed → suggest the next activity.** The current journey is incomplete at the result and feedback steps.

## Walkthrough evidence

| Step | Health | What happened | Evidence |
| --- | --- | --- | --- |
| 1. Enter Learn | Needs work | Four equal destinations, skill chips, and featured lessons. There is no prioritized next action tied to the player's Backhand score or goal. | [Learn home](01-learn-home.png) |
| 2. Open Skill Profile | Mixed | Backhand appears at 50% with an exclamation mark; seven skills say “No data yet.” The mark and percentage have no visible explanation in this view. The profile also has recommendations and a Retake Assessment action below the skill list in the implementation, but they are not exposed in the first viewport. One attempt while the local API was restarting produced only “Skill Profile not available,” with no retry action. | [Profile](18-skill-profile.png), [error state](02-skill-profile.png) |
| 3. Open Backhand details | Broken in this session | Tapping the Backhand card showed “Not available,” without context or recovery. Browsing Backhand from Learn did open two content items. | [Skill detail](19-backhand-skill.png), [Backhand content](20-browse-backhand.png) |
| 4. Open a drill | Partly useful | The 12-minute Backhand Consistency Drill gives a concrete task: 20 down-the-line backhands and a clean-contact streak. “Log this drill in Practice” opens a log with Backhand preselected. The form does not carry over the drill name or ask for the streak result. | [Drill](21-lesson.png), [drill to log](22-drill-to-log.png) |
| 5. Log practice | Easy input, weak payoff | The form captures date, skill, duration, a five-point feeling, and optional notes. After saving, the list shows “Backhand · 30 min · 3/5.” It gives no summary, goal link, recommendation, or prompt for the next session. The empty state has a large icon-only add button. | [Form](04-log-practice.png), [saved entry](06-practice-saved.png), [empty state](03-practice-log.png) |
| 6. Create a goal | Misleading status | A Backhand target of 4.0/6 created from a 3.0/6 baseline immediately showed “On track” while the current score remained 3.0/6. The goal had no deadline or milestones. Its detail offers “Mark Complete,” but no plan, next drill, or evidence of improvement. | [Goal form](08-create-goal.png), [goal detail](10-goal-detail.png) |
| 7. Read progress | Informational | The report displayed a Backhand bar without a numeric value, time comparison, explanation, or next step. Assessment History said only “Only one assessment so far.” Logging practice produced no visible progress narrative here. | [Report](16-progress-report.png), [history](17-assessment-history.png) |

### What the implementation confirms

- The backend derives `ON_TRACK` whenever a goal has no deadline or current score, even if no improvement has occurred (`backend/src/learning/skill-score.ts`). This explains the observed status, rather than a transient rendering bug.
- The skill score blends assessment baseline (60%) and average self-reported practice feeling (40%). One practice entry qualifies the score as `ESTABLISHED`. A 3/5 “Good” entry maps to 3.0/6. The UI does not explain that the score is largely self-report, so “50%” can be read as measured tennis proficiency.
- Lesson completion is deliberately excluded from the score blend (`backend/prisma/schema.prisma`). A completed lesson and the skill score can therefore diverge. This is reasonable mathematically, but the app should explain what each signal means.

## Recommendations, in priority order

### P0 — Make the next action clear

Turn Learn into a small training plan, starting with one personalized card: **“Improve your Backhand: try the 12-minute consistency drill.”** Show why it was selected, the goal it supports, and a single `Start drill` action. Keep the four destinations as secondary navigation. After the drill, send the player into a result-aware log, then return a next recommendation. This connects existing content and data without requiring an extensive new catalog.

### P0 — Restore trust in goals and scores

Use a neutral state such as **“No progress recorded yet”** when there is no deadline, no current score, or no improvement. Reserve “On track” for goals with a measurable plan and enough evidence to assess pace. Show baseline, current, target, source, and last update together. Explain the 0–6 scale and distinguish **self-reported practice trend** from demonstrated skill. Avoid treating one mood rating as strong evidence of proficiency.

### P1 — Capture a result, not just an activity

Keep the current short form, but when the player arrives from a drill, retain its title and ask the drill’s success measure. For this drill: “Best clean-contact streak out of 20?” A quick outcome and optional reflection (“What will you change next time?”) are more valuable than duration and feeling alone. Show a useful save confirmation: “You logged a 9-shot streak. Try to beat 9 next time.” Connect the entry to the active Backhand goal.

### P1 — Make goals actionable

Offer a suggested goal that pairs an outcome with a behavior, for example: **“Improve Backhand from 3.0 to 4.0; do two focused sessions a week for four weeks.”** Suggest relevant drills and allow a realistic deadline. Show completed sessions, best result, and the next planned session on goal detail. Keep manual completion for goals that cannot be automatically verified, but ask what changed and preserve the evidence.

### P1 — Replace the progress bar with an explanation

The report should answer: **What changed? What caused it? What should I do next?** For sparse data, say plainly “One Backhand session logged; too early to infer improvement.” Once there are repeated comparable results, show baseline versus current, dates, practice consistency, and goal movement. Link to the entry or drill that supports the claim. Assessment History should suggest when and why to reassess, rather than end in a dead end.

### P2 — Improve empty, error, and detail states

Give the practice and goal add buttons visible labels. For “No data yet,” offer an assessment or first practice action. For unavailable skill detail, distinguish no data from a loading/API error and offer retry. Explain the exclamation mark on the weakest skill. Put the recommended activity closer to the Backhand score, where it can answer “what now?”

## A small test of whether this creates value

Prototype the Backhand loop with the existing drill and recruit 5–8 beginner/intermediate players. Ask each to choose a focus, complete or describe a drill, log the result, and explain what the app wants them to do next. Measure whether they can state their next action and why it matters without prompting. In production, watch the share of goal creators who log a linked practice within seven days, return for a second focused session, and improve the same drill result over repeated attempts. Also ask whether the progress claim feels credible. These outcomes matter more than screen visits or raw log counts.

## Limits

This walkthrough used one demo account with one new practice entry and one new goal. It cannot establish long-term usefulness or whether players understand the score in real use. The local backend briefly restarted, causing one Skill Profile error; subsequent screens loaded. The Backhand skill-detail error was observed once. Accessibility observations are limited to visible UI; no screen reader or contrast audit was run.
