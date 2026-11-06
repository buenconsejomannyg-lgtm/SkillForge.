import {
  prototypeSchema,
  type ChecklistState,
  type PrototypeState,
} from "./models";
import { createInitialState, roadmap, weeklyTasks } from "./data";
export const STORAGE_KEY = "skillforge:prototype:v1";
export interface LocalStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type LoadResult = { state: PrototypeState; error: string | null };
export function loadPrototype(store: LocalStore): LoadResult {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { state: createInitialState(), error: null };
    const parsed = prototypeSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new Error("Invalid prototype");
    const lessonIds = new Set(
      roadmap.phases.flatMap((p) => p.lessons.map((l) => l.id)),
    );
    const taskIds = new Set(weeklyTasks.map((t) => t.id));
    for (const [records, ids] of [
      [parsed.data.lessonCompletion, lessonIds],
      [parsed.data.taskCompletion, taskIds],
    ] as const) {
      if (
        Object.entries(records).some(
          ([key, item]) => key !== item.itemId || !ids.has(key),
        )
      )
        throw new Error("Unknown checklist item");
    }
    return { state: parsed.data, error: null };
  } catch {
    return {
      state: createInitialState(),
      error:
        "Stored data could not be loaded. Temporary defaults are shown. Retry loading or reset to recover; the stored data has not been overwritten.",
    };
  }
}
export function savePrototype(
  store: LocalStore,
  state: PrototypeState,
): string | null {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(prototypeSchema.parse(state)));
    return null;
  } catch {
    return "Changes could not be saved in this browser. Your changes are available for this session only. Retry saving or reset the prototype.";
  }
}
export function toggleCompletion(
  records: Record<string, ChecklistState>,
  itemId: string,
  now = new Date().toISOString(),
): Record<string, ChecklistState> {
  const completed = !records[itemId]?.completed;
  return {
    ...records,
    [itemId]: { itemId, completed, completedAt: completed ? now : null },
  };
}
export function completionPercent(
  ids: string[],
  records: Record<string, ChecklistState>,
): number {
  return ids.length
    ? Math.round(
        (ids.filter((id) => records[id]?.completed).length / ids.length) * 100,
      )
    : 0;
}
