import { execSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

// Seeds the same admin every other e2e file uses (app.seed.seed_demo_user), so there
// is always at least one known-password member to sign in as and own tasks.
const MEMBER_EMAIL = process.env.SEED_USER_EMAIL ?? "demo@example.com";
const MEMBER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "password123";

test.beforeAll(() => {
  execSync("python -m app.seed", { cwd: "../backend", env: process.env, stdio: "pipe" });
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/, { timeout: 5000 });
}

async function openFreshProject(page: Page, projectName: string) {
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel(/project name/i).fill(projectName);
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });
  await page.getByText(projectName).click();
  await expect(page).toHaveURL(/\/project$/, { timeout: 5000 });
}

async function createTask(page: Page, title: string, opts: { status?: string } = {}) {
  await page.getByRole("button", { name: /new task/i }).click();
  await page.getByLabel(/title/i).first().fill(title);
  if (opts.status) {
    const statusField = page.getByLabel(/status/i).first();
    if (await statusField.count()) {
      await statusField.selectOption(opts.status);
    }
  }
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
}

test("[AC-020] each seeded task renders as a card in the column matching its status", async ({
  page,
}) => {
  const projectName = `Board Render ${Date.now()}`;
  const todoTitle = `Todo card ${Date.now()}`;
  const doingTitle = `Doing card ${Date.now()}`;
  const doneTitle = `Done card ${Date.now()}`;

  await signIn(page, MEMBER_EMAIL, MEMBER_PASSWORD);
  await openFreshProject(page, projectName);

  await createTask(page, todoTitle, { status: "todo" });
  await createTask(page, doingTitle, { status: "in_progress" });
  await createTask(page, doneTitle, { status: "done" });

  // Make sure we're on the board view.
  const boardTab = page.getByRole("tab", { name: /board/i });
  if (await boardTab.count()) {
    await boardTab.click();
  }

  const todoColumn = page.locator("section", { hasText: "To do" }).first();
  const doingColumn = page.locator("section", { hasText: "In progress" }).first();
  const doneColumn = page.locator("section", { hasText: "Done" }).first();

  await expect(todoColumn.getByRole("button", { name: todoTitle, exact: true })).toBeVisible();
  await expect(doingColumn.getByRole("button", { name: doingTitle, exact: true })).toBeVisible();
  await expect(doneColumn.getByRole("button", { name: doneTitle, exact: true })).toBeVisible();

  // And each card is absent from the columns it does not belong to.
  await expect(doingColumn.getByRole("button", { name: todoTitle, exact: true })).toHaveCount(0);
  await expect(doneColumn.getByRole("button", { name: todoTitle, exact: true })).toHaveCount(0);
});

test("[AC-021] dragging a card to another column moves it and the new status survives a reload", async ({
  page,
}) => {
  const projectName = `Board Drag ${Date.now()}`;
  const taskTitle = `Drag me ${Date.now()}`;

  await signIn(page, MEMBER_EMAIL, MEMBER_PASSWORD);
  await openFreshProject(page, projectName);
  await createTask(page, taskTitle, { status: "todo" });

  const boardTab = page.getByRole("tab", { name: /board/i });
  if (await boardTab.count()) {
    await boardTab.click();
  }

  const todoColumn = page.locator("section", { hasText: "To do" }).first();
  const doingColumn = page.locator("section", { hasText: "In progress" }).first();
  await expect(todoColumn.getByRole("button", { name: taskTitle, exact: true })).toBeVisible();

  const card = page.getByRole("button", { name: taskTitle, exact: true });
  const cardBox = await card.boundingBox();
  const targetBox = await doingColumn.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  if (cardBox && targetBox) {
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 20, { steps: 10 });
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 40, { steps: 10 });
    await page.mouse.up();
  }

  await expect(doingColumn.getByRole("button", { name: taskTitle, exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(todoColumn.getByRole("button", { name: taskTitle, exact: true })).toHaveCount(0);

  await page.reload();

  const doingColumnAfterReload = page.locator("section", { hasText: "In progress" }).first();
  await expect(
    doingColumnAfterReload.getByRole("button", { name: taskTitle, exact: true }),
  ).toBeVisible({ timeout: 10_000 });
});

test("[AC-022] list rows show title, owner, due date and status", async ({ page }) => {
  const projectName = `List Columns ${Date.now()}`;
  const taskTitle = `Row content check ${Date.now()}`;

  await signIn(page, MEMBER_EMAIL, MEMBER_PASSWORD);
  await openFreshProject(page, projectName);
  await createTask(page, taskTitle, { status: "in_progress" });

  const listTab = page.getByRole("tab", { name: /list/i });
  await listTab.click();

  // Column headers.
  await expect(page.getByRole("columnheader", { name: "Title" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Due date" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();

  const row = page.getByRole("row", { name: new RegExp(taskTitle) });
  await expect(row).toBeVisible({ timeout: 10_000 });

  // Owner select (defaults to Unassigned unless an owner was chosen on create).
  await expect(row.getByLabel(new RegExp(`Owner for ${taskTitle}`))).toBeVisible();
  // Due date text cell renders a date.
  await expect(row.locator("td", { hasText: /\d{4}/ })).toBeVisible();
  // Status select reflects the status chosen at creation.
  const statusSelect = row.getByLabel(new RegExp(`Status for ${taskTitle}`));
  await expect(statusSelect).toBeVisible();
  await expect(statusSelect).toHaveValue("in_progress");
});

test("[AC-023] changing a task's status from the list view updates the board without a reload", async ({
  page,
}) => {
  const projectName = `List To Board Sync ${Date.now()}`;
  const taskTitle = `Sync me ${Date.now()}`;

  await signIn(page, MEMBER_EMAIL, MEMBER_PASSWORD);
  await openFreshProject(page, projectName);
  await createTask(page, taskTitle, { status: "todo" });

  const listTab = page.getByRole("tab", { name: /list/i });
  await listTab.click();

  const row = page.getByRole("row", { name: new RegExp(taskTitle) });
  await expect(row).toBeVisible({ timeout: 10_000 });

  const statusSelect = row.getByLabel(new RegExp(`Status for ${taskTitle}`));
  await statusSelect.selectOption("done");

  await expect(page.getByText(/saved|synced|moved/i).first()).toBeVisible({ timeout: 10_000 });

  const boardTab = page.getByRole("tab", { name: /board/i });
  await boardTab.click();

  const doneColumn = page.locator("section", { hasText: "Done" }).first();
  const todoColumn = page.locator("section", { hasText: "To do" }).first();

  // Reflected on the board without a page reload.
  await expect(doneColumn.getByRole("button", { name: taskTitle, exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(todoColumn.getByRole("button", { name: taskTitle, exact: true })).toHaveCount(0);
});
