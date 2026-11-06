import { describe, expect, it } from "vitest";
import { createInitialState, roadmap } from "@/lib/data";
import { prototypeSchema, profileSchema } from "@/lib/models";
import {
  completionPercent,
  loadPrototype,
  savePrototype,
  STORAGE_KEY,
  toggleCompletion,
  type LocalStore,
} from "@/lib/persistence";

describe("prototype persistence", () => {
  it("starts with an empty working roadmap, distinct from sample scores", () => {
    const result = loadPrototype(localStorage);
    expect(result.error).toBeNull();
    expect(result.state).toEqual(createInitialState());
    expect(
      completionPercent(
        roadmap.phases.flatMap((p) => p.lessons.map((l) => l.id)),
        result.state.lessonCompletion,
      ),
    ).toBe(0);
  });
  it("roundtrips only editable prototype data and preserves completion timestamps", () => {
    const state = createInitialState();
    state.profile.displayName = "Alex";
    state.lessonCompletion = toggleCompletion(
      {},
      "lesson-16",
      "2026-11-06T01:00:00.000Z",
    );
    expect(savePrototype(localStorage, state)).toBeNull();
    expect(loadPrototype(localStorage).state).toEqual(state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).not.toHaveProperty(
      "avatar",
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).not.toHaveProperty(
      "xp",
    );
  });
  it.each([
    "{invalid",
    JSON.stringify({ ...createInitialState(), schemaVersion: 2 }),
    JSON.stringify({
      ...createInitialState(),
      profile: { ...createInitialState().profile, displayName: "" },
    }),
  ])(
    "preserves unsupported or malformed storage for explicit recovery",
    (raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      const result = loadPrototype(localStorage);
      expect(result.error).toContain("not been overwritten");
      expect(result.state).toEqual(createInitialState());
      expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    },
  );
  it("rejects inconsistent checklist identifiers and unknown lesson records", () => {
    const state = createInitialState();
    state.lessonCompletion = {
      unknown: { itemId: "unknown", completed: false, completedAt: null },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    expect(loadPrototype(localStorage).error).not.toBeNull();
    state.lessonCompletion = {
      "lesson-1": { itemId: "lesson-2", completed: false, completedAt: null },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    expect(loadPrototype(localStorage).error).not.toBeNull();
  });
  it("reports read and write failures without a success claim", () => {
    const unavailable: LocalStore = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
    };
    expect(loadPrototype(unavailable).error).not.toBeNull();
    expect(savePrototype(unavailable, createInitialState())).toContain(
      "session only",
    );
  });
  it("can reset invalid stored data through an explicit valid write", () => {
    localStorage.setItem(STORAGE_KEY, "broken");
    expect(loadPrototype(localStorage).error).not.toBeNull();
    expect(savePrototype(localStorage, createInitialState())).toBeNull();
    expect(loadPrototype(localStorage).error).toBeNull();
  });
});
describe("learning state and input validation", () => {
  it("tracks lessons and tasks independently and supports out-of-order completion", () => {
    const state = createInitialState();
    state.lessonCompletion = toggleCompletion(
      state.lessonCompletion,
      "lesson-16",
    );
    expect(
      completionPercent(["lesson-1", "lesson-16"], state.lessonCompletion),
    ).toBe(50);
    expect(completionPercent(["lesson-1"], state.taskCompletion)).toBe(0);
    expect(completionPercent([], state.lessonCompletion)).toBe(0);
    state.lessonCompletion = toggleCompletion(
      state.lessonCompletion,
      "lesson-16",
    );
    expect(state.lessonCompletion["lesson-16"]).toEqual({
      itemId: "lesson-16",
      completed: false,
      completedAt: null,
    });
  });
  it("rejects whitespace names, excessive biography, confidential extra fields, and inconsistent timestamps", () => {
    expect(
      profileSchema.safeParse({
        ...createInitialState().profile,
        displayName: "   ",
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        ...createInitialState().profile,
        biography: "x".repeat(601),
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        ...createInitialState().profile,
        password: "secret",
      }).success,
    ).toBe(false);
    const invalid = {
      ...createInitialState(),
      lessonCompletion: {
        "lesson-1": { itemId: "lesson-1", completed: true, completedAt: null },
      },
    };
    expect(prototypeSchema.safeParse(invalid).success).toBe(false);
  });
  it("preserves exactly four open phases with sixteen uniquely identified lessons", () => {
    expect(roadmap.phases.map((p) => p.title)).toEqual([
      "Foundations",
      "Intermediate Prompting and Context Engineering",
      "Advanced Evaluation, Safety, and Workflows",
      "AI Application and Expert-Level Practice",
    ]);
    expect(roadmap.phases.map((p) => [p.startWeek, p.endWeek])).toEqual([
      [1, 4],
      [5, 8],
      [9, 12],
      [13, 16],
    ]);
    expect(
      new Set(roadmap.phases.flatMap((p) => p.lessons.map((l) => l.id))).size,
    ).toBe(16);
  });
});
