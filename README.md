# SkillForge — Phase 2 local workspace

SkillForge uses Next.js App Router, React, TypeScript, Tailwind CSS, Zod, Radix UI primitives, Vitest and Playwright. The six-page shell and approved visual reference remain in place. No new runtime dependencies were added for Phase 2.

## Run locally

Use Node.js 24 LTS and npm from this directory:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000/dashboard. For the production preview use `npm run build` followed by `npm run start`. Webpack is retained for compatibility with the existing Windows environment. No cloud credentials or environment variables are required.

Use the same hostname consistently: localhost and 127.0.0.1 have separate browser storage. Refresh all previously opened SkillForge tabs after upgrading.

## Feature status

| Module | Working | Sample preview | Planned |
| --- | --- | --- | --- |
| Dashboard | Profile, activity counts, diagnostic, active tasks, analytics, XP, achievements, history, JSON backup/restore | Decorative mountain artwork and illustrative competency indicators | Cloud synchronization: Phase 3 |
| Skill Profile | Skills, categories, competencies/subskills, self-rating history, goals, evidence notes/links, archive/trash/restore | Optional starter skills; adoption creates unrated drafts | Evidence evaluation and verified proficiency: Phase 4 |
| Learning Center | Custom roadmaps, phases, weeks, objectives, lessons, assignments, resources/notes, dates, accessible ordering, completion | Immutable original 16-week template | No automated prerequisite enforcement or course-provider integration |
| Project Center | Projects, statuses, milestones, canonical tasks, priorities, dates, skill links, evidence, archive and restoration | Optional SciPrompt starter; adoption creates incomplete drafts | Portfolio selection/publishing workflow: Phase 5 |
| Assessment Center | Original informal diagnostic and source-status panels | Explicitly illustrative competency bars | Assessment engine/framework approval: Phase 4 |
| Portfolio Studio | Private sample preview reflects actual profile, including empty biography | Sample showcase and readiness | Content management, publishing, certificates, PDF/resume: Phase 5 |

## Using the workspace

- Add/edit records through their labeled dialogs. Completion controls record learning separately from edits.
- A shared activity can link to a skill, roadmap/week, project, and milestone. Its completion updates all views and earns at most one original activity reward.
- Add a practical completion note or evidence URL before completing an assignment. Complete all current project tasks and add a project completion note before completing a project.
- Self-ratings are append-only estimates; add another rating when your estimate changes. They never replace assessed results.
- Use resource records for tutorials, reference URLs, or learning notes. Evidence supports HTTP/HTTPS links and notes only; no evidence files are uploaded.
- Archive hides a record from active lists. Trash is recoverable and retains linked records, completion history and earned rewards. Use Archive & trash to restore. No permanent purge is implemented.
- Roadmap percentages count lessons and assignments. Tasks have separate totals. Empty groups display No activities. One week can contain multiple activities; all its assigned lessons/assignments must be complete for that week to count as complete. Learning order is recommended, never locked.
- Active analytics exclude archived/trash records; the alternate scope includes archived records. XP is historical ledger balance and is not reduced merely by hiding a record. Due dates use the browser’s local calendar; event timestamps are ISO instants.

## Migration and data safety

**Do not enter confidential information.** Local storage is browser/origin-specific prototype persistence. It has no account isolation, secure storage, automatic external backup, or cross-device synchronization. Clearing browser data can remove all local copies.

The new workspace lives at `skillforge:workspace:v2`. The original `skillforge:prototype:v1` JSON is copied exactly to `skillforge:prototype:v1:backup`, read back, and validated before cutover. The old key becomes an upgrade marker. The existing `skillforge:prototype:v1:write` Web Lock is retained so older coordinated writers cannot interleave migration operations.

Migration is prepared/active and resumable across interrupted writes. Existing profile text, empty biographies, lesson/task IDs, and completion timestamps are preserved. Completed Phase 1 records are permanently excluded from retroactive XP; migration creates no fictitious history or achievements. Invalid, unsupported or conflicting data is not silently replaced with defaults.

A small IndexedDB store (`skillforge-write-fence`) holds only the latest committed revision number. Chrome stress testing exposed stale renderer storage snapshots despite the mutex; the transactional revision check rejects these snapshots before any write. It retries briefly after pending storage notifications, then fails visibly if still stale. IndexedDB contains no workspace content and adds no dependency. An interrupted fence update fails closed; reviewed JSON restore or backed-up reset is required if refresh/retry cannot recover.

All workspace commands re-read current data under the lock, validate relationships, and commit completion/reward/achievement changes together. Independent field edits merge; overlapping edits retain the form draft. Structural edits and lifecycle actions check revisions. No unsafe write fallback is used when Web Locks or the revision guard is unavailable.

If an old tab replaces the upgrade marker, new writes pause. Export raw recovery data and refresh every tab. Both old/new records are retained. Do not reset until you have exported records you need; reviewed recovery may be necessary to reconcile an old writer’s changes.

### Backup and restore

Dashboard and Help provide:

- **Export workspace JSON**: a validated current workspace backup suitable for restore.
- **Export raw recovery data**: original stored strings and recovery snapshots, including malformed records. This recovery bundle is for inspection, not direct workspace restore.
- **Choose workspace JSON to restore**: validate a v2 active workspace, review profile/record/XP totals, then confirm replacement. A revision change cancels stale restore previews. Current data is backed up before replacement. The prototype import limit is 5 MB.

Reset requires confirmation and an unchanged snapshot. It backs up existing storage before creating a fresh workspace. Reset is never claimed saved after a failed write. Raw recovery exports include reset/restore snapshots; there is no automatic snapshot pruning or permanent purge in Phase 2.

Failed commands remain available for retry while the tab stays open. Conflicting drafts require conscious reconciliation. Unsaved session changes are not a durable backup.

## Approved progression rules — version 1

| Action | XP |
| --- | ---: |
| Lesson | 25 |
| Practical assignment with note/link | 50 |
| Learning/practice task linked to a skill | 10 |
| Project with completion note and at least one task, all tasks done | 150 |
| Other actions, general tasks, goals, resources, ratings and achievements | 0 |

Level = `1 + floor(net XP / 250)`. Initial level is 1; initial XP is 0. Project completion is an explicit bonus on top of eligible task rewards. The first completion fixes the reward entitlement; changing categories/types later cannot earn another reward. Reopening reverses original XP and recompletion restores it. Correcting a supporting project task also reopens its project and reverses that project’s bonus. Levels may decrease after reversals.

Achievements: First Step, Applied Practice, Milestone Complete, Phase Complete, First Project, and 10/25/50 eligible activities. Unlocks require newly recorded qualifying actions. Supporting event references and content revisions are retained. Completion corrections withdraw affected badges; recompletion restores them. Adding later learning content does not rewrite historical qualification.

XP and achievements acknowledge self-reported activity; they are not certification or measured proficiency.

## Diagnostic integrity

The same read-only informal diagnostic is shown across Dashboard, Skill Profile and Assessment Center:

- Knowledge: **36/40 (90%)**.
- Practical: **32/60 (53.3%)**.
- Overall: **68/100 (68%)**.
- Classification: **Intermediate — Provisional**.
- Independently verified proficiency: **Not verified**.

No date, rubric, authority or assessment version is invented. Sample competency bars are not diagnostic subscores. Self-reporting Expert does not establish verified Expert proficiency.

## Verification

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run test
npm run test:e2e
```

Playwright uses installed Chrome and a separate production test server on port 3100, overridable with `SKILLFORGE_TEST_PORT`. Tests use isolated browser contexts and do not operate on your normal Chrome data. Sandbox environments may require loopback access and a writable temporary directory for Vitest.

See `docs/phase2-qa.md` for executed results and limitations. The original design is at `references/skillforge-approved-design.png`; earlier QA documents describe historical Phase 1 results.
