import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/data";
import {
  STORAGE_KEY,
  toggleCompletion,
  type LocalStore,
} from "@/lib/persistence";
import {
  commitMutations,
  type PrototypeMutation,
  type WriteCoordinator,
} from "@/lib/storage-transactions";

function memoryStore(initial: string | null = null) {
  let raw = initial;
  const store: LocalStore = {
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
  };
  return store;
}
function coordinator(): WriteCoordinator {
  let tail = Promise.resolve<unknown>(undefined);
  return (operation) => {
    const job = tail.then(operation);
    tail = job.catch(() => undefined);
    return job;
  };
}
const complete = (id: string): PrototypeMutation => ({
  type: "completion",
  kind: "lessonCompletion",
  item: toggleCompletion({}, id, "2026-11-06T01:00:00.000Z")[id],
});

describe("serialized prototype transactions", () => {
  it("preserves concurrent profile, lesson, and task edits from stale snapshots", async () => {
    const state = createInitialState();
    const store = memoryStore();
    const lock = coordinator();
    const results = await Promise.all([
      commitMutations(
        store,
        [
          {
            type: "profile",
            base: state.profile,
            profile: { ...state.profile, displayName: "Alex" },
          },
        ],
        lock,
      ),
      commitMutations(store, [complete("lesson-1")], lock),
      commitMutations(
        store,
        [
          {
            type: "completion",
            kind: "taskCompletion",
            item: toggleCompletion({}, "watch-context")["watch-context"],
          },
        ],
        lock,
      ),
    ]);
    expect(results.map((r) => r.status)).toEqual(["saved", "saved", "saved"]);
    const saved = JSON.parse(store.getItem(STORAGE_KEY)!);
    expect(saved.profile.displayName).toBe("Alex");
    expect(saved.lessonCompletion["lesson-1"].completed).toBe(true);
    expect(saved.taskCompletion["watch-context"].completed).toBe(true);
    expect(saved.schemaVersion).toBe(1);
  });
  it("merges independent fields while retaining an intentionally empty biography", async () => {
    const state = createInitialState();
    const store = memoryStore();
    const lock = coordinator();
    await Promise.all([
      commitMutations(
        store,
        [
          {
            type: "profile",
            base: state.profile,
            profile: { ...state.profile, displayName: "Alex" },
          },
        ],
        lock,
      ),
      commitMutations(
        store,
        [
          {
            type: "profile",
            base: state.profile,
            profile: { ...state.profile, biography: "" },
          },
        ],
        lock,
      ),
    ]);
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).profile).toEqual({
      ...state.profile,
      displayName: "Alex",
      biography: "",
    });
  });
  it("rejects conflicting fields without committing any portion of a batch", async () => {
    const state = createInitialState();
    const store = memoryStore();
    const lock = coordinator();
    await commitMutations(
      store,
      [
        {
          type: "profile",
          base: state.profile,
          profile: { ...state.profile, displayName: "First" },
        },
      ],
      lock,
    );
    const before = store.getItem(STORAGE_KEY);
    const result = await commitMutations(
      store,
      [
        complete("lesson-1"),
        {
          type: "profile",
          base: state.profile,
          profile: { ...state.profile, displayName: "Second" },
        },
      ],
      lock,
    );
    expect(result.status).toBe("conflict");
    expect(result.message).toContain("display name");
    expect(store.getItem(STORAGE_KEY)).toBe(before);
  });
  it("makes duplicate completion intent idempotent and preserves its original timestamp", async () => {
    const store = memoryStore();
    const lock = coordinator();
    await commitMutations(store, [complete("lesson-1")], lock);
    const next = complete("lesson-1");
    if (next.type === "completion")
      next.item.completedAt = "2026-11-06T02:00:00.000Z";
    await commitMutations(store, [next], lock);
    expect(
      JSON.parse(store.getItem(STORAGE_KEY)!).lessonCompletion["lesson-1"]
        .completedAt,
    ).toBe("2026-11-06T01:00:00.000Z");
  });
  it("retains an overlapping field that has already reached the same desired value", async () => {
    const initial = createInitialState();
    const current = {
      ...initial,
      profile: {
        ...initial.profile,
        displayName: "Alex",
        headline: "Updated elsewhere",
      },
    };
    const store = memoryStore(JSON.stringify(current));
    const result = await commitMutations(
      store,
      [
        {
          type: "profile",
          base: initial.profile,
          profile: { ...initial.profile, displayName: "Alex" },
        },
      ],
      coordinator(),
    );
    expect(result.status).toBe("saved");
    expect(result.state?.profile.headline).toBe("Updated elsewhere");
  });
  it("preserves malformed storage until an explicit reset of the captured value", async () => {
    const store = memoryStore("broken");
    const lock = coordinator();
    expect(
      (await commitMutations(store, [complete("lesson-1")], lock)).status,
    ).toBe("unavailable");
    expect(store.getItem(STORAGE_KEY)).toBe("broken");
    expect(
      (
        await commitMutations(
          store,
          [{ type: "reset", expectedRaw: "broken" }],
          lock,
        )
      ).status,
    ).toBe("saved");
    expect(JSON.parse(store.getItem(STORAGE_KEY)!)).toEqual(
      createInitialState(),
    );
  });
  it("refuses a reset when saved data changed after confirmation opened", async () => {
    const store = memoryStore();
    const lock = coordinator();
    const expectedRaw = store.getItem(STORAGE_KEY);
    await commitMutations(store, [complete("lesson-1")], lock);
    const before = store.getItem(STORAGE_KEY);
    expect(
      (await commitMutations(store, [{ type: "reset", expectedRaw }], lock))
        .status,
    ).toBe("conflict");
    expect(store.getItem(STORAGE_KEY)).toBe(before);
  });
  it("never falls back to unsafe writes without a coordination API", async () => {
    const store = memoryStore("original bytes");
    const result = await commitMutations(store, [complete("lesson-1")]);
    expect(result.status).toBe("unavailable");
    expect(result.message).toContain("session only");
    expect(store.getItem(STORAGE_KEY)).toBe("original bytes");
  });
  it("reports write failure and safely replays an intent against newer saved data", async () => {
    const state = createInitialState();
    const backing = memoryStore(JSON.stringify(state));
    const lock = coordinator();
    const blocked: LocalStore = {
      getItem: backing.getItem,
      setItem() {
        throw new Error("quota");
      },
    };
    expect(
      (await commitMutations(blocked, [complete("lesson-1")], lock)).status,
    ).toBe("unavailable");
    await commitMutations(
      backing,
      [
        {
          type: "profile",
          base: state.profile,
          profile: { ...state.profile, displayName: "Remote Alex" },
        },
      ],
      lock,
    );
    await commitMutations(backing, [complete("lesson-1")], lock);
    const saved = JSON.parse(backing.getItem(STORAGE_KEY)!);
    expect(saved.profile.displayName).toBe("Remote Alex");
    expect(saved.lessonCompletion["lesson-1"].completed).toBe(true);
  });
  it("supports a pending confirmed reset followed by new session activity on retry", async () => {
    const state = createInitialState();
    state.profile.displayName = "Before reset";
    const store = memoryStore(JSON.stringify(state));
    const result = await commitMutations(
      store,
      [
        { type: "reset", expectedRaw: store.getItem(STORAGE_KEY) },
        complete("lesson-2"),
      ],
      coordinator(),
    );
    expect(result.status).toBe("saved");
    expect(result.state?.profile.displayName).toBe("Manny");
    expect(result.state?.lessonCompletion["lesson-2"].completed).toBe(true);
  });
});
