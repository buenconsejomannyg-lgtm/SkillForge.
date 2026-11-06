import type { ChecklistState, Roadmap } from "./models";

export function diagnosticPercent(score: {
  earned: number;
  maximum: number;
}): number {
  return score.maximum > 0 ? (score.earned / score.maximum) * 100 : 0;
}
export function formatPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

/** Weeks describe the schedule; completed lessons and tasks are distinct activities. */
export function learningProgress(
  roadmap: Roadmap,
  lessons: Record<string, ChecklistState>,
  taskIds: string[],
  tasks: Record<string, ChecklistState>,
) {
  const scheduledWeeks = [
    ...new Set(
      roadmap.phases.flatMap((phase) =>
        Array.from(
          { length: phase.endWeek - phase.startWeek + 1 },
          (_, i) => phase.startWeek + i,
        ),
      ),
    ),
  ];
  const lessonRecords = roadmap.phases.flatMap((phase) => phase.lessons);
  const lessonIds = [...new Set(lessonRecords.map((lesson) => lesson.id))];
  const completedLessons = lessonIds.filter(
    (id) => lessons[id]?.completed,
  ).length;
  const uniqueTasks = [...new Set(taskIds)];
  const completedTasks = uniqueTasks.filter(
    (id) => tasks[id]?.completed,
  ).length;
  const completedWeeks = scheduledWeeks.filter((week) => {
    const assigned = lessonRecords.filter((lesson) => lesson.week === week);
    return (
      assigned.length > 0 &&
      assigned.every((lesson) => lessons[lesson.id]?.completed)
    );
  }).length;
  return {
    totalWeeks: scheduledWeeks.length,
    completedWeeks,
    totalLessons: lessonIds.length,
    completedLessons,
    lessonPercent: lessonIds.length
      ? Math.round((completedLessons / lessonIds.length) * 100)
      : 0,
    totalTasks: uniqueTasks.length,
    completedTasks,
    taskPercent: uniqueTasks.length
      ? Math.round((completedTasks / uniqueTasks.length) * 100)
      : 0,
    completedActivities: completedLessons + completedTasks,
  };
}
