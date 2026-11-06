import { describe, expect, it } from "vitest";
import {
  baseline,
  createInitialState,
  initialProgression,
  roadmap,
  weeklyTasks,
} from "@/lib/data";
import {
  diagnosticPercent,
  formatPercent,
  learningProgress,
} from "@/lib/progress";
import {
  toggleCompletion,
  STORAGE_KEY,
  loadPrototype,
} from "@/lib/persistence";

describe("informal diagnostic and progression", () => {
  it("uses weighted point results with the supplied provisional classification", () => {
    expect(baseline.knowledge).toEqual({ earned: 36, maximum: 40 });
    expect(baseline.practical).toEqual({ earned: 32, maximum: 60 });
    expect(baseline.overall).toEqual({ earned: 68, maximum: 100 });
    expect(baseline.knowledge.earned + baseline.practical.earned).toBe(
      baseline.overall.earned,
    );
    expect(
      [baseline.knowledge, baseline.practical, baseline.overall].map((value) =>
        formatPercent(diagnosticPercent(value)),
      ),
    ).toEqual(["90%", "53.3%", "68%"]);
    expect(baseline.classification).toBe("Intermediate");
    expect(baseline.status).toBe("provisional");
    expect(baseline.nature).toBe("informal");
    expect(baseline.independentlyVerified).toBe(false);
    expect(initialProgression).toEqual({ level: 1, xp: 0 });
  });
});
describe("learning units", () => {
  it("does not equate a completed lesson with a completed week or task", () => {
    const custom = {
      ...roadmap,
      phases: [
        {
          ...roadmap.phases[0],
          lessons: [
            {
              id: "week1-a",
              title: "First lesson",
              week: 1,
              resourceReferences: [],
            },
            {
              id: "week1-b",
              title: "Second lesson",
              week: 1,
              resourceReferences: [],
            },
            {
              id: "week2-a",
              title: "Another lesson",
              week: 2,
              resourceReferences: [],
            },
          ],
        },
      ],
    };
    let lessons = toggleCompletion({}, "week1-a");
    let progress = learningProgress(custom, lessons, ["task-a", "task-b"], {});
    expect(progress).toMatchObject({
      totalWeeks: 4,
      totalLessons: 3,
      completedWeeks: 0,
      completedLessons: 1,
      lessonPercent: 33,
      completedTasks: 0,
      completedActivities: 1,
    });
    lessons = toggleCompletion(lessons, "week1-b");
    progress = learningProgress(
      custom,
      lessons,
      ["task-a", "task-b"],
      toggleCompletion({}, "task-a"),
    );
    expect(progress).toMatchObject({
      completedWeeks: 1,
      completedLessons: 2,
      lessonPercent: 67,
      completedTasks: 1,
      taskPercent: 50,
      completedActivities: 3,
    });
  });
  it("counts actual complete records, excludes unknown IDs, and handles undo", () => {
    let lessons = toggleCompletion({}, "lesson-16");
    lessons = toggleCompletion(lessons, "unrelated-id");
    const tasks = toggleCompletion({}, weeklyTasks[0].id);
    const progress = learningProgress(
      roadmap,
      lessons,
      weeklyTasks.map((task) => task.id),
      tasks,
    );
    expect(progress).toMatchObject({
      totalWeeks: 16,
      totalLessons: 16,
      completedWeeks: 1,
      completedLessons: 1,
      lessonPercent: 6,
      totalTasks: 4,
      completedTasks: 1,
      taskPercent: 25,
      completedActivities: 2,
    });
    expect(
      learningProgress(roadmap, toggleCompletion(lessons, "lesson-16"), [], {})
        .completedWeeks,
    ).toBe(0);
    expect(
      learningProgress({ ...roadmap, phases: [] }, {}, [], {}),
    ).toMatchObject({ lessonPercent: 0, taskPercent: 0, completedWeeks: 0 });
    expect(initialProgression.xp).toBe(0);
  });
  it("loads existing v1 records unchanged; diagnostic corrections require no storage migration", () => {
    const state = createInitialState();
    state.profile.displayName = "Saved learner";
    state.lessonCompletion = toggleCompletion(
      {},
      "lesson-4",
      "2026-11-06T01:00:00.000Z",
    );
    state.taskCompletion = toggleCompletion(
      {},
      "watch-context",
      "2026-11-06T01:02:00.000Z",
    );
    const original = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, original);
    expect(loadPrototype(localStorage)).toEqual({ state, error: null });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });
});
