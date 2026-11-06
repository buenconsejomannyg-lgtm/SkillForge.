# Phase 1 dashboard corrections

## Changes

- Dashboard, Skill Profile, Assessment Center, and prototype help use the same informal AI diagnostic record: Knowledge 36/40 (90%), Practical 32/60 (53.3%), Overall 68/100 (68%), Intermediate — Provisional.
- These user-supplied results are explicitly separate from independently verified proficiency. They are not professional certification. Missing assessment date, rubric, framework, and version metadata remain unavailable.
- Illustrative competency bars from the design are still labeled as design samples, not subscores of this diagnostic.
- Starting progression is Level 1 and 0 XP. No retroactive awards, level thresholds, or XP engine have been introduced.
- Dashboard spacing is scoped to the dashboard. The profile and learning summary share a more compact row; actual diagnostic metrics and status are grouped; weekly tasks precede the lower skill overview and active-focus cards. All five skill indicators are visible, and long accepted display names wrap.
- Learning summaries distinguish scheduled weeks, completed lessons, the current weekly task set, and completed activities. Lesson percentage uses actual lesson IDs. A week requires all assigned lessons to be complete; an empty scheduled week is not automatically complete. Task progress is independent. Each completed lesson or task counts as one activity.

## Existing data

No migration is required: the local-storage key `skillforge:prototype:v1`, schema version, profile fields, and lesson/task IDs are unchanged. Neither diagnostic data nor the old sample XP/level values were stored in that schema. Changing the static diagnostic and starting progression therefore does not require clearing or rewriting user data.

Regression tests seed an existing v1 profile with completed lesson/task timestamps, navigate across pages, reload, and verify the original storage string is unchanged. A subsequent checklist edit preserves the earlier profile and completion timestamps. Tests run in isolated browser contexts, without clearing the user's browser data.

At this dashboard-only checkpoint, cross-tab write conflicts, biography fallback, and mobile Help access were outside scope. They are addressed in the subsequent final Phase 1 stabilization; see the current verification record and README for the updated behavior.

## Validation

Use `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, then `npm run test:e2e` against that build. ESLint 10 with the installed Next.js configuration is now configured; `--max-warnings 0` makes warnings fail the check. Two documented, line-specific exceptions retain intentional browser-storage hydration and session-only blob image rendering without changing their behavior.

Unit coverage includes a week with multiple lessons, a week with no assigned lessons, independent tasks, undo, unknown IDs, correct diagnostic percentages, starting progression, and v1 storage compatibility. Browser coverage includes cross-page diagnostic agreement, storage preservation, long-name mobile layout, and early desktop task visibility, in addition to the existing Phase 1 suite.

Phase 2 remains unimplemented. Local persistence is still temporary prototype storage for non-confidential information.
