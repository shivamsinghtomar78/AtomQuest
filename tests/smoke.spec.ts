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
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("landing page has no mobile overflow at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseURL);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("open workspace smoke", () => {
  test.skip(
    !process.env.PLAYWRIGHT_AUTH_SMOKE,
    "Set PLAYWRIGHT_AUTH_SMOKE=1 with a reachable database to run workspace coverage."
  );

  test("dashboard opens without sign-in", async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
