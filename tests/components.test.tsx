import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PrototypeProvider,
  usePrototype,
} from "@/components/prototype-provider";
import { ProfileEditor } from "@/components/profile-editor";
import { Assessments } from "@/features/assessments";
import { WORKSPACE_KEY } from "@/lib/workspace-storage";
import { STORAGE_KEY } from "@/lib/persistence";

function Harness() {
  const { ready, state, toggle, error, reset } = usePrototype();
  return ready ? (
    <>
      <ProfileEditor />
      <output aria-label="Current name">{state.profile.displayName}</output>
      <button onClick={() => toggle("lessonCompletion", "lesson-16")}>
        Toggle last lesson
      </button>
      <output aria-label="Lesson state">
        {String(state.lessonCompletion["lesson-16"]?.completed ?? false)}
      </output>
      {error && <p role="alert">{error}</p>}
      <button onClick={() => void reset()}>Reset test state</button>
    </>
  ) : (
    <p>Loading prototype</p>
  );
}
describe("working prototype components", () => {
  it("validates profile edits and persists a successful save", async () => {
    render(
      <PrototypeProvider>
        <Harness />
      </PrototypeProvider>,
    );
    await screen.findByRole("button", { name: "Edit profile" });
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: " " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("Enter a display name.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Alex" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(
      await screen.findByText("Profile saved in this browser."),
    ).toBeVisible();
    expect(
      JSON.parse(localStorage.getItem(WORKSPACE_KEY)!).profile.displayName,
    ).toBe("Alex");
  });
  it("preserves corrupt data until an explicit backed-up reset", async () => {
    localStorage.setItem(STORAGE_KEY, "corrupt");
    render(
      <PrototypeProvider>
        <Harness />
      </PrototypeProvider>,
    );
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Toggle last lesson" }));
    await waitFor(()=>expect(screen.getByRole("alert")).toBeVisible());
    expect(localStorage.getItem(STORAGE_KEY)).toBe("corrupt");
    fireEvent.click(screen.getByRole("button", { name: "Reset test state" }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(
      JSON.parse(localStorage.getItem(WORKSPACE_KEY)!).entities["lesson-16"].status,
    ).toBe("todo");
  });
  it("does not claim persistence when storage rejects a profile edit", async () => {
    render(
      <PrototypeProvider>
        <Harness />
      </PrototypeProvider>,
    );
    await screen.findByRole("button", { name: "Edit profile" });
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(
      await screen.findByText(/Profile updated for this session only/),
    ).toBeVisible();
    expect(
      screen.queryByText("Profile saved in this browser."),
    ).not.toBeInTheDocument();
    spy.mockRestore();
  });
  it("clears stale success feedback when the form changes or becomes invalid", async () => {
    render(
      <PrototypeProvider>
        <Harness />
      </PrototypeProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Profile saved in this browser.");
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "   " },
    });
    expect(
      screen.queryByText("Profile saved in this browser."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("Enter a display name.")).toBeVisible();
  });
  it("prevents a pending save from replacing newly typed form edits", async () => {
    render(
      <PrototypeProvider>
        <Harness />
      </PrototypeProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByLabelText("Display name")).toBeDisabled();
    expect(screen.getByLabelText("Biography")).toBeDisabled();
    await screen.findByText("Profile saved in this browser.");
    expect(screen.getByLabelText("Display name")).toBeEnabled();
  });
  it("retains an open conflicting draft and explicitly reloads the saved profile", async () => {
    render(
      <PrototypeProvider>
        <Harness />
      </PrototypeProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Local draft" },
    });
    const external = JSON.parse(localStorage.getItem(WORKSPACE_KEY)!);
    external.profile.displayName = "External name";
    external.profile.biography = "External biography";
    external.revision++;
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(external));
    fireEvent(window, new StorageEvent("storage", { key: WORKSPACE_KEY }));
    expect(screen.getByLabelText("Display name")).toHaveValue("Local draft");
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await within(
      screen.getByRole("dialog", { name: "Make it yours" }),
    ).findByText(/Another tab changed your display name/);
    expect(
      JSON.parse(localStorage.getItem(WORKSPACE_KEY)!).profile.displayName,
    ).toBe("External name");
    expect(screen.getByLabelText("Display name")).toHaveValue("Local draft");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Discard draft & load saved profile",
      }),
    );
    expect(screen.getByLabelText("Display name")).toHaveValue("External name");
    expect(screen.getByLabelText("Biography")).toHaveValue(
      "External biography",
    );
  });
  it("keeps assessment modes disabled while reporting the informal diagnostic separately from verified proficiency", async () => {
    render(<Assessments />);
    expect(
      screen.getByRole("button", { name: /Take diagnostic/ }),
    ).toBeDisabled();
    expect(screen.getByText("36/40")).toBeVisible();
    expect(screen.getByText("(90%)")).toBeVisible();
    expect(screen.getByText("32/60")).toBeVisible();
    expect(screen.getByText("(53.3%)")).toBeVisible();
    expect(screen.getByText("68/100")).toBeVisible();
    expect(screen.getByText("(68%)")).toBeVisible();
    expect(screen.getByText("Intermediate — Provisional")).toBeVisible();
    expect(screen.getByText("Not verified")).toBeVisible();
    expect(screen.queryByText("Not assessed")).not.toBeInTheDocument();
    fireEvent.mouseDown(
      screen.getByRole("tab", { name: "Assessment History" }),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Assessment History" }));
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "Assessment History" }),
      ).toHaveAttribute("aria-selected", "true"),
    );
  });
});
