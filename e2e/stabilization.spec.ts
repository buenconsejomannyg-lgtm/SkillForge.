import { test, expect, type Page } from "@playwright/test";
const key = "skillforge:workspace:v2";
async function ready(page: Page, route: string) {
  await page.goto(route);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
async function edit(page: Page) {
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Make it yours" }),
  ).toBeVisible();
}
async function saved(page: Page) {
  await expect(
    page.getByText("Profile saved in this browser.", { exact: true }),
  ).toBeVisible();
}
async function stored(page: Page) {
  return page.evaluate((key) => {const w=JSON.parse(localStorage.getItem(key)!);return {...w,lessonCompletion:Object.fromEntries(Object.values(w.entities).filter((x)=>{const e=x as {kind:string;activityKind:string;status:string};return e.kind==="activity"&&e.activityKind==="lesson"&&e.status==="done";}).map(x=>{const e=x as {id:string;completedAt:string};return [e.id,{completed:true,completedAt:e.completedAt}];})),taskCompletion:Object.fromEntries(Object.values(w.entities).filter((x)=>{const e=x as {kind:string;activityKind:string;status:string};return e.kind==="activity"&&e.activityKind==="task"&&e.status==="done";}).map(x=>{const e=x as {id:string;completedAt:string};return [e.id,{completed:true,completedAt:e.completedAt}];}))};}, key);
}

test("concurrent profile and checklist writes preserve both updates and synchronize tabs", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await ready(page, "/dashboard");
  await ready(other, "/learning");
  await edit(page);
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Cross-tab learner");
  await Promise.all([
    page.getByRole("button", { name: "Save profile", exact: true }).click(),
    other.getByRole("checkbox", { name: /AI Basics and Capabilities/ }).check(),
  ]);
  await saved(page);
  await expect
    .poll(
      async () =>
        (await stored(other))?.lessonCompletion["lesson-1"]?.completed,
    )
    .toBe(true);
  expect((await stored(other)).profile.displayName).toBe("Cross-tab learner");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".dashboard-learning .learning-counts")).toContainText("1/16");
  await other.goto("/dashboard");
  await expect(
    other.getByRole("heading", { name: "Welcome back, Cross-tab learner!" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back, Cross-tab learner!" }),
  ).toBeVisible();
});
test("independent fields in already-open profile drafts merge without replacing unrelated fields", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await ready(page, "/dashboard");
  await ready(other, "/dashboard");
  await edit(page);
  await edit(other);
  await page.getByLabel("Display name", { exact: true }).fill("Alex");
  await other
    .getByLabel("Biography", { exact: true })
    .fill("A biography written in the second tab.");
  await Promise.all([
    page.getByRole("button", { name: "Save profile", exact: true }).click(),
    other.getByRole("button", { name: "Save profile", exact: true }).click(),
  ]);
  await saved(page);
  await saved(other);
  const result = await stored(page);
  expect(result.profile.displayName).toBe("Alex");
  expect(result.profile.biography).toBe(
    "A biography written in the second tab.",
  );
  expect(result.profile.headline).toBe("AI Learner & EdTech Builder");
});
test("overlapping profile edits report a conflict and retain the unsaved draft until explicitly discarded", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await ready(page, "/dashboard");
  await ready(other, "/dashboard");
  await edit(page);
  await edit(other);
  await page
    .getByLabel("Display name", { exact: true })
    .fill("First saved name");
  await other
    .getByLabel("Display name", { exact: true })
    .fill("Second unsaved draft");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await saved(page);
  await expect(other.getByLabel("Display name", { exact: true })).toHaveValue(
    "Second unsaved draft",
  );
  await other.screenshot({
    path: "test-results/stabilization/profile-conflict.png",
  });
  await other
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await expect(
    other.getByRole("dialog", { name: "Make it yours" }),
  ).toContainText("Another tab changed your display name");
  expect((await stored(other)).profile.displayName).toBe("First saved name");
  await expect(other.getByLabel("Display name", { exact: true })).toHaveValue(
    "Second unsaved draft",
  );
  await other
    .getByRole("button", { name: "Discard draft & load saved profile" })
    .click();
  await expect(other.getByLabel("Display name", { exact: true })).toHaveValue(
    "First saved name",
  );
  await other
    .getByLabel("Headline", { exact: true })
    .fill("A consciously revised headline");
  await other
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await saved(other);
  expect((await stored(other)).profile.displayName).toBe("First saved name");
  expect((await stored(other)).profile.headline).toBe(
    "A consciously revised headline",
  );
});
test("simultaneous writes to the same checkbox keep completion rather than toggling it back", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await ready(page, "/learning");
  await ready(other, "/learning");
  await other.evaluate(async()=>{await new Promise<void>(ready=>{void navigator.locks.request("skillforge:prototype:v1:write",()=>new Promise<void>(release=>{(window as unknown as {releaseCompletionLock:()=>void}).releaseCompletionLock=release;ready();}));});});
  await Promise.all([
    page.getByRole("checkbox", { name: /AI Basics and Capabilities/ }).check(),
    other.getByRole("checkbox", { name: /AI Basics and Capabilities/ }).check(),
  ]);
  await other.evaluate(()=>(window as unknown as {releaseCompletionLock:()=>void}).releaseCompletionLock());
  await expect
    .poll(
      async () => (await stored(page))?.lessonCompletion["lesson-1"]?.completed,
    )
    .toBe(true);
  await page.reload();
  await other.reload();
  await expect(
    page.getByRole("checkbox", { name: /AI Basics and Capabilities/ }),
  ).toBeChecked();
  await expect(
    other.getByRole("checkbox", { name: /AI Basics and Capabilities/ }),
  ).toBeChecked();
  expect(Object.keys((await stored(page)).lessonCompletion)).toHaveLength(1);
  await expect(
    page.getByRole("progressbar", { name: "Roadmap completion", exact: true }),
  ).toHaveAttribute("aria-valuenow", "6");
});
test("queued activity writes retain rapid changes while another tab holds the storage lock", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await ready(page, "/learning");
  await ready(other, "/learning");
  await other.evaluate(async () => {
    const scope = window as unknown as {
      releaseTestLock: () => void;
      lockReady: Promise<void>;
    };
    scope.lockReady = new Promise<void>((resolve) => {
      void navigator.locks.request(
        "skillforge:prototype:v1:write",
        () =>
          new Promise<void>((release) => {
            scope.releaseTestLock = release;
            resolve();
          }),
      );
    });
    await scope.lockReady;
  });
  const first = page.getByRole("checkbox", {
    name: /AI Basics and Capabilities/,
  });
  await first.check();
  await first.uncheck();
  await first.check();
  await page
    .getByRole("checkbox", { name: /Prompt Engineering Fundamentals/ })
    .check();
  await page
    .getByRole("checkbox", { name: /Try three prompt variations/ })
    .check();
  await other.evaluate(() =>
    (window as unknown as { releaseTestLock: () => void }).releaseTestLock(),
  );
  await expect
    .poll(async () => {
      const result = await stored(page);
      return Object.values(result?.lessonCompletion ?? {}).filter(
        (item) => (item as { completed: boolean }).completed,
      ).length;
    })
    .toBe(2);
  await expect
    .poll(
      async () =>
        (await stored(page))?.taskCompletion["practice-prompts"]?.completed,
    )
    .toBe(true);
  await page.reload();
  await expect(first).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /Prompt Engineering Fundamentals/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /Try three prompt variations/ }),
  ).toBeChecked();
});
test("reset cannot erase an update saved in another tab after the reset dialog opened", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await ready(page, "/dashboard");
  await ready(other, "/learning");
  await page
    .locator("footer")
    .getByRole("button", { name: "Reset prototype" })
    .click();
  await other
    .getByRole("checkbox", { name: /Try three prompt variations/ })
    .check();
  await expect
    .poll(
      async () =>
        (await stored(other))?.taskCompletion["practice-prompts"]?.completed,
    )
    .toBe(true);
  await page
    .getByRole("dialog", { name: "Reset this prototype?" })
    .getByRole("button", { name: "Reset prototype", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Reset canceled" }),
  ).toBeVisible();
  expect(
    (await stored(page)).taskCompletion["practice-prompts"].completed,
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: /Try three prompt variations/ }),
  ).toBeChecked();
});
test("saved biography and intentional emptiness survive navigation and refresh without sample fallback", async ({
  page,
}) => {
  await ready(page, "/dashboard");
  await edit(page);
  await page
    .getByLabel("Biography", { exact: true })
    .fill("My own biography, preserved exactly.");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await saved(page);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.goto("/portfolio");
  await expect(page.locator(".portfolio-biography")).toHaveText(
    "My own biography, preserved exactly.",
  );
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await edit(page);
  await page.getByLabel("Biography", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await saved(page);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await expect(page.locator(".portfolio-biography")).toHaveCount(0);
  await expect(page.locator(".portfolio-headline")).toHaveText(
    "AI Learner & EdTech Builder",
  );
  await expect(
    page.getByText(
      "A personal space for learning, building, and sharing thoughtful work.",
    ),
  ).toHaveCount(0);
  expect((await stored(page)).profile.biography).toBe("");
  await page.goto("/dashboard");
  await edit(page);
  await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("");
});
test("mobile Help is reachable from every module and restores menu focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 850 });
  for (const route of [
    "/dashboard",
    "/skills",
    "/learning",
    "/assessments",
    "/projects",
    "/portfolio",
  ]) {
    await ready(page, route);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("dialog", { name: "Navigation", exact: true })
      .getByRole("button", { name: "Help & prototype info" })
      .click();
    const help = page.getByRole("dialog", { name: "About this prototype" });
    await expect(help).toBeVisible();
    await expect(help).toContainText(
      "Local storage is temporary and browser-specific",
    );
    await expect(help).toContainText("Intermediate");
    await expect(help).toContainText("36/40");
    if (route === "/dashboard")
      await page.screenshot({
        path: "test-results/stabilization/mobile-help.png",
      });
    await page.keyboard.press("Escape");
    await expect(help).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(375);
  }
});
test("unsupported write coordination is explicit and does not overwrite existing data", async ({
  page,
}) => {
  await ready(page, "/learning");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    }),
  );
  await page
    .getByRole("checkbox", { name: /AI Basics and Capabilities/ })
    .check();
  await expect(
    page.getByRole("alert").filter({ hasText: "Storage needs attention" }),
  ).toContainText("not saved");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).not.toBeNull();
});

test("a failed profile save keeps its original conflict baseline when reopened and preserves queued activity", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await ready(page, "/dashboard");
  await ready(other, "/dashboard");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage =
      () => {
        Storage.prototype.setItem = original;
      };
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded");
    };
  });
  await edit(page);
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Unsaved local name");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByText(
      "Profile updated for this session only. See the storage notice.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await edit(other);
  await other
    .getByLabel("Display name", { exact: true })
    .fill("Saved remote name");
  await other
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await saved(other);
  await page.getByRole("checkbox", { name: /Explore context windows/ }).check();
  const notice = page
    .getByRole("alert")
    .filter({ hasText: "Storage needs attention" });
  await expect(notice).toContainText("Another tab changed your display name");
  await page.evaluate(() =>
    (window as unknown as { restoreStorage: () => void }).restoreStorage(),
  );
  await edit(page);
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Unsaved local name",
  );
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Make it yours" }),
  ).toContainText("Another tab changed your display name");
  await expect(
    page.getByText("Profile saved in this browser.", { exact: true }),
  ).toHaveCount(0);
  expect((await stored(page)).profile.displayName).toBe("Saved remote name");
  await page
    .getByRole("button", { name: "Discard draft & load saved profile" })
    .click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Saved remote name",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(notice).toBeHidden();
  expect((await stored(page)).profile.displayName).toBe("Saved remote name");
  expect((await stored(page)).taskCompletion["watch-context"].completed).toBe(
    true,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back, Saved remote name!" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /Explore context windows/ }),
  ).toBeChecked();
});
