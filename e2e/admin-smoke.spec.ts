import { test, expect } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe("admin smoke", () => {
  test("login → dashboard → products", async ({ page }) => {
    test.skip(
      !email || !password,
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this smoke test.",
    );

    await page.goto("/admin/login");

    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("link", { name: "Products" }).first().click();
    await expect(page).toHaveURL(/\/admin\/products/);
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
      timeout: 20_000,
    });
  });
});
