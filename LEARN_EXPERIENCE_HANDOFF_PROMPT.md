# Handover prompt: turn Learn into a practical training loop

Paste the prompt below into the implementation session. The full product proposal is [docs/LEARN_PRACTICAL_TRAINING_LOOP.md](docs/LEARN_PRACTICAL_TRAINING_LOOP.md); the emulator evidence is [audit/learn-experience-2026-11-03/report.md](audit/learn-experience-2026-11-03/report.md).

---

You are working in the Drift Tennis repository. Implement the practical Learn experience described in `docs/LEARN_PRACTICAL_TRAINING_LOOP.md`. The objective is a connected player journey: **focus skill → recommended activity → practice result → credible feedback → next activity**. Do not stop after redesigning individual screens or adding static demo cards. Use the real signed-in player's learning data and the existing backend endpoints.

Read first:

- `docs/LEARN_PRACTICAL_TRAINING_LOOP.md` for the intended behavior, priority slices, integrity rules, and acceptance criteria.
- `audit/learn-experience-2026-11-03/report.md` and its linked emulator screenshots for observed current behavior.
- `foundation/03-user-journeys.md` §8 and `foundation/04-screen-inventory.md` §A.7 for the original journey and screen contracts.
- `backend/src/learning/skill-score.ts`, `backend/src/learning/learning.service.ts`, `backend/src/learning/learning.controller.ts`, `backend/src/learning/dto/`, and the learning models in `backend/prisma/schema.prisma`.
- `mobile/lib/features/learning/` for the existing Flutter screens, repository, and providers.

Current facts to account for:

- The Backhand Consistency Drill gives a measurable exercise and its CTA opens the practice form with Backhand selected, but the drill name and result are not carried through to a useful post-save view. `PracticeSession` and its DTO already support optional `drillId`.
- Practice currently records date, duration, skill, feeling, and optional notes. One “Good” Backhand entry appeared as 3/5 and yielded a 50% Backhand score in the walkthrough.
- `computeSkillScores` currently weights assessment 60% and average self-reported feeling 40%, and labels one practice entry `ESTABLISHED`. The UI must not present that as an objective tennis proficiency measurement.
- `deriveGoalStatus` returns `ON_TRACK` when a deadline or current score is missing. A newly created goal with current equal to baseline was shown as “On track.” Correct this status semantics in backend and UI.
- Progress Report currently shows a skill bar and Assessment History link with no dated comparison or next action. Lesson completion is intentionally separate from skill scoring.
- The working tree may contain unrelated in-flight changes. Inspect it first. Preserve them and stage only files belonging to this Learn work if committing.

Implement in these slices, checking each against the product spec:

1. **Trust:** introduce a neutral goal status for insufficient evidence; explain score source, sample count, freshness, and 0–6 scale; make no-data and API-error states actionable. A new goal at an unchanged baseline cannot display “On track.”
2. **Connected Backhand path:** put one data-driven next-activity card on Learn; route to the real published drill; carry `drillId` and skill into practice; capture the drill's best clean-contact streak out of 20 as a structured, optional result; show that result in the log and relevant goal. Keep old sessions valid.
3. **Useful feedback:** after saving, show the recorded result and the next action. With one result, call it a baseline. With repeated comparable results, show the change and supporting dated entries in Progress Report. Explain when evidence is too sparse to infer improvement. Link an active goal to relevant practice with an explicit, reviewable rule.
4. **Goal plan:** make the goal detail actionable with a recommended drill, linked sessions, and an easy log-progress action. Offer a realistic behavior/frequency alongside a score target; keep manual completion clear and distinguish it from measured achievement.

Implementation constraints:

- Use real repositories/providers and API responses; avoid hard-coded player progress or mockups as the final behavior.
- Keep logging quick. Drill-specific results are optional, and practices without a drill still work.
- Compare only outcomes with the same definition and unit. Do not infer improvement from one feeling rating, one session, or completed reading content.
- Keep backward compatibility for existing goals and sessions; include migrations and API contract updates when the data model changes.
- Preserve localization across English, French, and Spanish for new visible strings, using the project's generated localization workflow.
- Add focused backend tests for score/status and result integrity, plus mobile tests for drill-to-log context and sparse-data states. Test meaningful behavior rather than mirroring widget layout.
- Review the actual Android screens on the emulator after implementation. Finish the changes before reinstalling or rebuilding the app, consistent with the owner's earlier workflow preference. Run the backend and verify the connected flow end to end.

Report back with: what changed in each of the four sections; the score and goal-status rules chosen; migration/API changes; test and emulator evidence; remaining limitations. Do not claim long-term user benefit is proven by an emulator walkthrough. The research check in the product spec remains the next validation step.
