import { test, expect } from "@playwright/test";
const routes = [
  ["/dashboard", "Dashboard"],
  ["/skills", "Skill Profile"],
  ["/learning", "Learning Center"],
  ["/assessments", "Assessment Center"],
  ["/projects", "Project Center"],
  ["/portfolio", "Portfolio Studio"],
] as const;
test("root redirect, six direct routes, active navigation, and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, label] of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("Preparing your workspace…")).toBeHidden();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${route} overflows at ${width}px`).toBe(false);
      if (width >= 768)
        await expect(
          page
            .getByRole("navigation", { name: "Main navigation" })
            .getByRole("link", { name: label }),
        ).toHaveAttribute("aria-current", "page");
    }
  }
  expect(errors).toEqual([]);
});
test("mobile drawer navigates to all six pages and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto("/dashboard");
  for (const [route, label] of routes) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", {
      name: "Navigation",
      exact: true,
    });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(drawer).toBeHidden();
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});
test("profile validates, persists, and reflects in the private portfolio preview", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("Display name", { exact: true }).fill("   ");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Enter a display name.")).toBeVisible();
  await page.getByLabel("Display name", { exact: true }).fill("Alex");
  await page
    .getByLabel("Headline", { exact: true })
    .fill("Learning through building");
  await page
    .getByLabel("Biography", { exact: true })
    .fill("A non-confidential prototype bio.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved in this browser.")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back, Alex!" }),
  ).toBeVisible();
  await page.goto("/portfolio");
  await expect(
    page.getByRole("heading", { name: "Hi, I’m Alex." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Publish portfolio/ }),
  ).toBeDisabled();
});
test("all roadmap phases are open; new lesson and task completions earn approved XP", async ({
  page,
}) => {
  await page.goto("/learning");
  await page.getByRole("button", { name: /Weeks 13–16/ }).click();
  const last = page.getByRole("checkbox", {
    name: /Present a Capstone and Reflect/,
  });
  await last.check();
  await page
    .getByRole("checkbox", { name: /Try three prompt variations/ })
    .check();
  await expect(
    page.getByRole("progressbar", { name: "Roadmap completion" }),
  ).toHaveAttribute("aria-valuenow", "6");
  await page.reload();
  await page.getByRole("button", { name: /Weeks 13–16/ }).click();
  await expect(last).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /Try three prompt variations/ }),
  ).toBeChecked();
  await page.goto("/dashboard");
  await expect(page.locator(".xp-line").getByText("35 XP", { exact: true })).toBeVisible();
  await expect(page.getByText("Lv. 1", { exact: true })).toBeVisible();
  await expect(
    page
      .locator(".dashboard-diagnostic")
      .getByText("Not verified", { exact: true }),
  ).toBeVisible();
});
test("skill selection and tabs display actual panels with honest feature states", async ({
  page,
}) => {
  await page.goto("/skills");
  await page.getByRole("button",{name:/Prompt Engineering Personal development/}).click();
  await expect(page.getByRole("heading",{name:"Prompt Engineering",exact:true}).first()).toBeVisible();
  await page.getByRole("tab",{name:"Evidence",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Supporting evidence · unverified"})).toBeVisible();
  await page.goto("/assessments");
  await expect(
    page.getByText("Informal AI competency diagnostic", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Take diagnostic/ }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Standards & Sources" }).click();
  await expect(page.getByText("Not supplied or approved")).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByRole("button",{name:"Add project",exact:true})).toBeEnabled();
  await page.getByRole("tab",{name:"Starter sample",exact:true}).click();
  await expect(page.getByRole("button",{name:"Use sample",exact:true})).toBeEnabled();
});
test("diagnostic results agree across all three pages and retain provisional status", async ({
  page,
}) => {
  for (const route of ["/dashboard", "/skills", "/assessments"]) {
    await page.goto(route);
    const metrics = page.locator(".diagnostic-metrics").first();
    for (const value of [
      "Knowledge Assessment",
      "36/40",
      "(90%)",
      "Practical Assessment",
      "32/60",
      "(53.3%)",
      "Overall Diagnostic Score",
      "68/100",
      "(68%)",
    ]) {
      await expect(metrics.getByText(value, { exact: true })).toBeVisible();
    }
    await expect(
      page.getByText("Intermediate — Provisional", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Not assessed", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByText("Not determined", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.locator("main")).toContainText(/independently verified/i);
  }
});
test("existing profile and activity records survive corrections, navigation, and reload", async ({
  page,
}) => {
  const original = JSON.stringify({
    schemaVersion: 1,
    profile: {
      id: "local-profile",
      displayName: "Existing learner",
      headline: "Keep my learning records",
      biography: "Existing non-confidential profile.",
    },
    lessonCompletion: {
      "lesson-4": {
        itemId: "lesson-4",
        completed: true,
        completedAt: "2026-11-06T01:00:00.000Z",
      },
    },
    taskCompletion: {
      "watch-context": {
        itemId: "watch-context",
        completed: true,
        completedAt: "2026-11-06T01:02:00.000Z",
      },
    },
  });
  await page.addInitScript((raw) => {
    if (!localStorage.getItem("skillforge:prototype:v1"))
      localStorage.setItem("skillforge:prototype:v1", raw);
  }, original);
  for (const route of ["/dashboard", "/skills", "/assessments", "/learning"]) {
    await page.goto(route);
    await expect(page.getByText("Preparing your workspace…")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("skillforge:prototype:v1:backup"),
      ),
    ).toBe(original);
  }
  await expect(
    page.getByRole("checkbox", { name: /Responsible and Effective Use/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /Explore context windows/ }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: /AI Basics and Capabilities/ })
    .check();
  const updated = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("skillforge:workspace:v2")!),
  );
  expect(updated.profile.displayName).toBe("Existing learner");
  expect(updated.entities["lesson-4"].completedAt).toBe(
    "2026-11-06T01:00:00.000Z",
  );
  expect(updated.entities["watch-context"].completedAt).toBe(
    "2026-11-06T01:02:00.000Z",
  );
  await page.goto("/dashboard");
  const counts = page.locator(".dashboard-learning .learning-counts");
  for (const [label, value] of [
    ["Weeks complete", "2/16"],
    ["Lessons complete", "2/16"],
    ["Weekly tasks", "1/4"],
    ["Completed activities", "3"],
  ]) {
    await expect(
      counts
        .locator("div")
        .filter({ has: page.getByText(label, { exact: true }) })
        .locator("dd"),
    ).toHaveText(value);
  }
  await expect(page.locator(".xp-line").getByText("25 XP", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back, Existing learner!" }),
  ).toBeVisible();
});
test("dashboard fits long names and brings working tasks earlier on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  const tasks = await page
    .getByRole("heading", { name: "Weekly tasks", exact: true })
    .boundingBox();
  expect(tasks!.y).toBeLessThan(900);
  await page.setViewportSize({ width: 375, height: 850 });
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("Display name", { exact: true }).fill("A".repeat(60));
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
test("corrupt storage is preserved until confirmed reset", async ({ page }) => {
  const storageNotice = page
    .getByRole("alert")
    .filter({ hasText: "Storage needs attention" });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("corrupt-seeded")) {
      localStorage.setItem("skillforge:prototype:v1", "broken");
      sessionStorage.setItem("corrupt-seeded", "yes");
    }
  });
  await page.goto("/learning");
  await expect(storageNotice).toContainText("Stored data could not be loaded");
  await page
    .getByRole("checkbox", { name: /AI Basics and Capabilities/ })
    .check();
  expect(
    await page.evaluate(() => localStorage.getItem("skillforge:prototype:v1")),
  ).toBe("broken");
  await storageNotice.getByRole("button", { name: "Reset prototype" }).click();
  await page.getByRole("button", { name: "Keep my changes" }).click();
  await expect(
    page.getByRole("checkbox", { name: /AI Basics and Capabilities/ }),
  ).toBeChecked();
  await storageNotice.getByRole("button", { name: "Reset prototype" }).click();
  await page
    .getByRole("dialog", { name: "Reset this prototype?" })
    .getByRole("button", { name: "Reset prototype", exact: true })
    .click();
  await expect(storageNotice).toBeHidden();
  await expect(
    page.getByRole("checkbox", { name: /AI Basics and Capabilities/ }),
  ).not.toBeChecked();
  await page.reload();
  await expect(storageNotice).toBeHidden();
});
test("storage write failure is visible and retry saves the session state", async ({
  page,
}) => {
  const storageNotice = page
    .getByRole("alert")
    .filter({ hasText: "Storage needs attention" });
  await page.goto("/learning");
  await expect(
    page.getByRole("checkbox", { name: /AI Basics and Capabilities/ }),
  ).toBeVisible();
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
  await page
    .getByRole("checkbox", { name: /AI Basics and Capabilities/ })
    .check();
  await expect(storageNotice).toContainText("not saved");
  await page.evaluate(() =>
    (window as unknown as { restoreStorage: () => void }).restoreStorage(),
  );
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(storageNotice).toBeHidden();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: /AI Basics and Capabilities/ }),
  ).toBeChecked();
});
test("avatar validates images and preview is session-only", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Edit profile" }).click();
  const file = page.getByLabel("Choose profile image");
  await file.setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(
    page.getByText("This image could not be read. Choose another image."),
  ).toBeVisible();
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=",
    "base64",
  );
  await file.setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(
    page.getByText("Image preview ready. It lasts for this session only."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".profile-hero img")).toBeVisible();
  await page.reload();
  await expect(page.locator(".profile-hero img")).toHaveCount(0);
});
test("keyboard and reduced-motion behavior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learning");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const tab = page.getByRole("tab", { name: "My Roadmap" });
  await tab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Manage roadmaps" })).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Roadmaps", exact: true }),
  ).toBeVisible();
});
test("capture six desktop and mobile screens for manual design review", async ({
  page,
}) => {
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route] of routes) {
      await page.goto(route);
      await expect(page.getByText("Preparing your workspace…")).toBeHidden();
      await page.screenshot({
        path: `test-results/review/${route.slice(1)}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }
});
