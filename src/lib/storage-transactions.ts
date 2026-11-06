import { createInitialState } from "./data";
import type {
  ChecklistState,
  PrototypeProfile,
  PrototypeState,
} from "./models";
import {
  loadPrototype,
  savePrototype,
  STORAGE_KEY,
  type LocalStore,
} from "./persistence";

export const STORAGE_LOCK = `${STORAGE_KEY}:write`;
export type WriteCoordinator = <T>(operation: () => T) => Promise<T>;
export type PrototypeMutation =
  | { type: "profile"; base: PrototypeProfile; profile: PrototypeProfile }
  | {
      type: "completion";
      kind: "lessonCompletion" | "taskCompletion";
      item: ChecklistState;
    }
  | { type: "reset"; expectedRaw: string | null };
export type CommitResult = {
  status: "saved" | "conflict" | "unavailable";
  state: PrototypeState | null;
  message: string | null;
};
const profileFields = ["displayName", "headline", "biography"] as const;
const fieldNames = {
  displayName: "display name",
  headline: "headline",
  biography: "biography",
};

/** A three-way merge preserves unrelated changes and rejects overlapping edits. */
export function mergeMutation(
  current: PrototypeState,
  mutation: Exclude<PrototypeMutation, { type: "reset" }>,
): CommitResult {
  if (mutation.type === "profile") {
    const changed = profileFields.filter(
      (field) => mutation.profile[field] !== mutation.base[field],
    );
    const conflicts = changed.filter(
      (field) =>
        current.profile[field] !== mutation.base[field] &&
        current.profile[field] !== mutation.profile[field],
    );
    if (conflicts.length)
      return {
        status: "conflict",
        state: current,
        message: `Another tab changed your ${conflicts.map((field) => fieldNames[field]).join(", ")}. Saved data was not overwritten. Your draft remains in this tab.`,
      };
    const profile = { ...current.profile };
    for (const field of changed) profile[field] = mutation.profile[field];
    return { status: "saved", state: { ...current, profile }, message: null };
  }
  const existing = current[mutation.kind][mutation.item.itemId];
  // Setting the same completion twice is idempotent and retains the first timestamp.
  const item =
    existing?.completed === mutation.item.completed ? existing : mutation.item;
  return {
    status: "saved",
    state: {
      ...current,
      [mutation.kind]: { ...current[mutation.kind], [item.itemId]: item },
    },
    message: null,
  };
}

/** No await occurs between fresh read and write while the origin-wide lock is held. */
export async function commitMutations(
  store: LocalStore,
  mutations: PrototypeMutation[],
  coordinate?: WriteCoordinator,
): Promise<CommitResult> {
  if (!coordinate)
    return {
      status: "unavailable",
      state: null,
      message:
        "This browser cannot coordinate safe multi-tab writes. Changes remain in this session only. Use a current browser with Web Locks support to save.",
    };
  try {
    return await coordinate(() => {
      const raw = store.getItem(STORAGE_KEY);
      const reset = mutations[0];
      let starting: PrototypeState;
      if (reset?.type === "reset") {
        if (raw !== reset.expectedRaw)
          return {
            status: "conflict",
            state: loadPrototype(store).state,
            message:
              "Reset canceled because saved data changed in another tab. Reopen the reset dialog to review and confirm the current data.",
          };
        starting = createInitialState();
      } else {
        const loaded = loadPrototype(store);
        if (loaded.error)
          return { status: "unavailable", state: null, message: loaded.error };
        starting = loaded.state;
      }
      let next = starting;
      for (const mutation of mutations) {
        if (mutation.type === "reset") continue;
        const merged = mergeMutation(next, mutation);
        if (merged.status !== "saved") return { ...merged, state: starting };
        next = merged.state!;
      }
      const message =
        raw !== null &&
        reset?.type !== "reset" &&
        JSON.stringify(next) === JSON.stringify(starting)
          ? null
          : savePrototype(store, next);
      return {
        status: message ? "unavailable" : "saved",
        state: next,
        message,
      };
    });
  } catch {
    return {
      status: "unavailable",
      state: null,
      message:
        "Changes could not be saved in this browser. They remain in this session only. Retry saving when browser storage is available.",
    };
  }
}
