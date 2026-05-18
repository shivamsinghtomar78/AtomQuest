import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("public smoke", () => {
  test("landing page renders primary portal messaging", async ({ page }) => {
    await page.goto(baseURL);
    await expect(page.getByRole("heading", { name: "Set goals that actually drive teams forward" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("login keeps demo-role access ergonomic", async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Employee" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manager" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Admin" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("signup offers email and Google account creation", async ({ page }) => {
    await page.goto(`${baseURL}/signup`);
    await expect(page.getByRole("heading", { name: "Create your AtomQuest account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Employee" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("landing page has no mobile overflow at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseURL);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("authenticated smoke", () => {
  test.skip(
    !process.env.PLAYWRIGHT_AUTH_SMOKE,
    "Set PLAYWRIGHT_AUTH_SMOKE=1 after Firebase demo users are seeded to run role workflow coverage."
  );

  test("employee demo login reaches dashboard", async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.getByRole("button", { name: "Employee" }).click();
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
