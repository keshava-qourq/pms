import { expect, test } from "@playwright/test";

import { adminCredentials } from "./support/admin";

// Drives project and task creation through the real browser (the way a member
// would), then confirms the save through the API directly -- not just by reading
// it back off the screen -- so a bug that corrupts a field on write but still
// renders something plausible in the UI (e.g. a stale cache) would not slip past.
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

test("[US-006][US-007] a task created on the board round-trips through the API with the fields entered in the form", async ({
  page,
}) => {
  const { email, password } = adminCredentials();
  const projectName = `Cross-check project ${Date.now()}`;
  const taskTitle = `Cross-check task ${Date.now()}`;

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/, { timeout: 10_000 });

  // The session JWT apiFetch sends as `Authorization: Bearer <token>` (see
  // frontend/src/lib/api.ts) -- reused below to call the API directly, the
  // same way the app itself would.
  const token = await page.evaluate(() => localStorage.getItem("pms.auth.token"));
  expect(token).toBeTruthy();

  const [createProjectResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().endsWith("/projects") && res.request().method() === "POST",
    ),
    (async () => {
      await page.getByRole("button", { name: "New project" }).click();
      await page.getByLabel(/^Name/i).fill(projectName);
      await page.getByRole("button", { name: "Create project" }).click();
    })(),
  ]);
  expect(createProjectResponse.ok(), await createProjectResponse.text()).toBeTruthy();
  const project = await createProjectResponse.json();

  await page.getByRole("button", { name: projectName }).click();
  await expect(page).toHaveURL(/\/project$/, { timeout: 10_000 });

  const [createTaskResponse] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().endsWith(`/projects/${project.id}/tasks`) && res.request().method() === "POST",
    ),
    (async () => {
      await page.getByRole("button", { name: "New task" }).click();
      await page.getByLabel(/^Title/i).fill(taskTitle);
      await page.getByLabel(/^Due date$/i).fill("2026-12-10");
      await page.getByLabel(/^Status$/i).selectOption("in_progress");
      await page.getByRole("button", { name: "Create task" }).click();
    })(),
  ]);
  expect(createTaskResponse.ok(), await createTaskResponse.text()).toBeTruthy();
  const task = await createTaskResponse.json();

  const apiCheck = await page.request.get(`${API}/tasks/${task.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(apiCheck.ok(), await apiCheck.text()).toBeTruthy();
  const detail = await apiCheck.json();

  expect(detail.task.title).toBe(taskTitle);
  expect(detail.task.project_id).toBe(project.id);
  expect(detail.task.due_date).toBe("2026-12-10");
  expect(detail.task.status).toBe("in_progress");
});
