import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
// jsdom has no IndexedDB. Real revision-guard integration is covered in Chrome;
// these component tests exercise the queued command and form behavior.
vi.mock("@/lib/browser-coordinator", () => ({
  latestFenceRevision: () => 0,
  coordinateBrowser: () => navigator.locks?.request ? (operation: () => unknown) => navigator.locks.request("skillforge:prototype:v1:write", operation) : undefined,
}));
beforeEach(() => {
  let tail = Promise.resolve<unknown>(undefined);
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: (_name: string, operation: () => unknown) => {
        const result = tail.then(operation);
        tail = result.catch(() => undefined);
        return result;
      },
    },
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
