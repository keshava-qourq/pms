import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

// A member with a known password, seeded directly in the backend's own database
// (the same one the webServer config points `uvicorn` at) rather than through the
// UI: there is no public sign-up route, and `app.seed.seed_demo_user` is the
// idempotent helper the backend ships for exactly this. Safe to call before every
// run of this file.
const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "demo@example.com";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "password123";

test.beforeAll(() => {
  execSync("python -m app.seed", {
    cwd: "../backend",
    env: process.env,
    stdio: "pipe",
  });
});

test("[AC-001] a seeded member signs in and lands on the projects overview", async ({ page }) => {
  await page.goto("/sign-in");

  await page.getByLabel("Email address").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText(/Signed in as/i)).toBeVisible();
  await expect(page).toHaveURL(/\/projects$/, { timeout: 5000 });
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
});

test("[AC-002] wrong credentials show the invalid-credentials error and the user stays on /sign-in", async ({
  page,
}) => {
  await page.goto("/sign-in");

  await page.getByLabel("Email address").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText(/those credentials are invalid/i)).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("[AC-003] navigating directly to /projects while signed out redirects to /sign-in", async ({
  page,
}) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("[AC-003] navigating directly to /task while signed out redirects to /sign-in", async ({
  page,
}) => {
  await page.goto("/task");
  await expect(page).toHaveURL(/\/sign-in$/);
});
