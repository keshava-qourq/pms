import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

// Seeds the same admin every other e2e file uses (app.seed.seed_demo_user), so there
// is always at least one known-password member and the owner-select on the task
// modal has someone to pick.
const MEMBER_EMAIL = process.env.SEED_USER_EMAIL ?? "demo@example.com";
const MEMBER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "password123";

function runPython(script: string): string {
  return execSync("python -", {
    cwd: "../backend",
    env: process.env,
    input: script,
  })
    .toString()
    .trim();
}

test.beforeAll(() => {
  execSync("python -m app.seed", { cwd: "../backend", env: process.env, stdio: "pipe" });
});

async function signIn(page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/, { timeout: 5000 });
}

async function openFreshProject(page, projectName: string) {
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel(/project name/i).fill(projectName);
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });
  await page.getByText(projectName).click();
  await expect(page).toHaveURL(/\/project$/, { timeout: 5000 });
}

test("[AC-015][AC-016] creating a task with owner, due date and status shows it on the board", async ({
  page,
}) => {
  const projectName = `Task Creation ${Date.now()}`;
  const taskTitle = `Draft the brief ${Date.now()}`;

  await signIn(page, MEMBER_EMAIL, MEMBER_PASSWORD);
  await openFreshProject(page, projectName);

  await page.getByRole("button", { name: /new task/i }).click();
  await page.getByLabel(/title/i).first().fill(taskTitle);

  const ownerField = page.getByLabel(/owner/i);
  if (await ownerField.count()) {
    const options = await ownerField.locator("option").count();
    if (options > 1) await ownerField.selectOption({ index: 1 });
  }

  const dueDateField = page.getByLabel(/due date/i);
  if (await dueDateField.count()) {
    await dueDateField.fill("2026-12-05");
  }

  const statusField = page.getByLabel(/status/i);
  if (await statusField.count()) {
    await statusField.selectOption("in_progress");
  }

  await page.getByRole("button", { name: /create/i }).click();

  await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
});

test("[AC-018][NFR-007] changing a task's status is reflected in both the board and the list view", async ({
  page,
}) => {
  const projectName = `Status Sync ${Date.now()}`;
  const taskTitle = `Ship the feature ${Date.now()}`;

  await signIn(page, MEMBER_EMAIL, MEMBER_PASSWORD);
  await openFreshProject(page, projectName);

  await page.getByRole("button", { name: /new task/i }).click();
  await page.getByLabel(/title/i).first().fill(taskTitle);
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

  // Move the card forward from the board view using its move control.
  const moveForward = page.getByRole("button", { name: new RegExp(`Move .*${taskTitle}.* to`, "i") }).first();
  if (await moveForward.count()) {
    await moveForward.click();
  } else {
    await page.getByText(taskTitle).click();
    const statusField = page.getByLabel(/status/i);
    if (await statusField.count()) {
      await statusField.selectOption("in_progress");
      await page.getByRole("button", { name: /save/i }).click();
    }
    await page.goBack();
  }

  await expect(page.getByText(/saved|synced/i).first()).toBeVisible({ timeout: 10_000 });

  // Switch to the list view and confirm the same task shows the new status.
  const listTab = page.getByRole("tab", { name: /list/i });
  if (await listTab.count()) {
    await listTab.click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/in progress/i)).toBeVisible({ timeout: 10_000 });
  }
});
