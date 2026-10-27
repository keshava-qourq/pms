import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

// Two distinct members, seeded directly in the backend's own database (same
// approach as invitations.spec.ts's MEMBER_EMAIL): there is no public sign-up
// route, so this is the supported way to get two known-password accounts in
// before the run. Idempotent: re-running the suite does not duplicate them.
const MEMBER_A_EMAIL = "flat-access-a@example.com";
const MEMBER_A_PASSWORD = "member-a-password-123";
const MEMBER_B_EMAIL = "flat-access-b@example.com";
const MEMBER_B_PASSWORD = "member-b-password-123";

function runPython(script: string): string {
  return execSync("python -", {
    cwd: "../backend",
    env: process.env,
    input: script,
  })
    .toString()
    .trim();
}

function seedMember(email: string, password: string): void {
  runPython(`
from app.database import SessionLocal
from app.models import User
from app.security import hash_password

db = SessionLocal()
existing = db.query(User).filter(User.email == "${email}").first()
if existing is None:
    db.add(
        User(
            email="${email}",
            password_hash=hash_password("${password}"),
            name="${email.split("@")[0]}",
            is_admin=False,
        )
    )
    db.commit()
db.close()
`);
}

test.beforeAll(() => {
  execSync("python -m app.seed", { cwd: "../backend", env: process.env, stdio: "pipe" });
  seedMember(MEMBER_A_EMAIL, MEMBER_A_PASSWORD);
  seedMember(MEMBER_B_EMAIL, MEMBER_B_PASSWORD);
});

async function signIn(page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/, { timeout: 5000 });
}

test("[AC-007] a signed-in member sees a project created by another member in the overview", async ({
  page,
}) => {
  const projectName = `Flat Access Project ${Date.now()}`;

  // Member A creates the project.
  await signIn(page, MEMBER_A_EMAIL, MEMBER_A_PASSWORD);
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel(/project name/i).fill(projectName);
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });

  // Member B signs in separately and sees it in their own overview.
  await page.context().clearCookies();
  await signIn(page, MEMBER_B_EMAIL, MEMBER_B_PASSWORD);
  await page.getByLabel("Search projects").fill(projectName);
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });
});

test("[AC-008] a member opens a project they did not create, edits a task, and the change is visible after reload", async ({
  page,
}) => {
  const projectName = `Cross Member Edit ${Date.now()}`;
  const taskTitle = `Original task ${Date.now()}`;
  const editedTitle = `Edited by B ${Date.now()}`;

  // Member A creates a project and a task on it.
  await signIn(page, MEMBER_A_EMAIL, MEMBER_A_PASSWORD);
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel(/project name/i).fill(projectName);
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });

  await page.getByText(projectName).click();
  await expect(page).toHaveURL(/\/project$/, { timeout: 5000 });
  await page.getByRole("button", { name: /new task|add task/i }).click();
  await page.getByLabel(/title/i).first().fill(taskTitle);
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

  // Member B signs in, opens the same project (not theirs) and edits the task.
  await page.context().clearCookies();
  await signIn(page, MEMBER_B_EMAIL, MEMBER_B_PASSWORD);
  await page.getByLabel("Search projects").fill(projectName);
  await page.getByText(projectName).click();
  await expect(page).toHaveURL(/\/project$/, { timeout: 5000 });

  await page.getByText(taskTitle).click();
  const titleField = page.getByLabel(/title/i).first();
  await titleField.fill(editedTitle);
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.getByText(editedTitle)).toBeVisible({ timeout: 10_000 });
});

test("[NFR-006] the projects overview renders usably at a 375px mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });

  await signIn(page, MEMBER_A_EMAIL, MEMBER_A_PASSWORD);

  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New project" })).toBeVisible();
  await expect(page.getByLabel("Search projects")).toBeVisible();

  // No horizontal scroll: content fits within the viewport width.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(400);
});

test("[AC-012][AC-013] the dashboard lists a project's name and task progress, and selecting it opens its tasks", async ({
  page,
}) => {
  const projectName = `Overview Progress ${Date.now()}`;
  const taskTitle = `Progress task ${Date.now()}`;

  await signIn(page, MEMBER_A_EMAIL, MEMBER_A_PASSWORD);

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel(/project name/i).fill(projectName);
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });

  // Isolate the row by filtering the search to this project's name.
  await page.getByLabel("Search projects").fill(projectName);
  const row = page.locator("li", { hasText: projectName });
  await expect(row).toBeVisible({ timeout: 10_000 });
  // Progress is shown as "N of M tasks complete" for a freshly created,
  // task-less project (AC-012).
  await expect(row.getByText(/0 of 0 tasks complete/i)).toBeVisible();

  // Selecting the project navigates into its tasks (AC-013).
  await row.getByText(projectName).click();
  await expect(page).toHaveURL(/\/project$/, { timeout: 5000 });

  await page.getByRole("button", { name: /new task|add task/i }).click();
  await page.getByLabel(/title/i).first().fill(taskTitle);
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

  // Back on the dashboard, the progress count reflects the new task.
  await page.goto("/projects");
  await page.getByLabel("Search projects").fill(projectName);
  const updatedRow = page.locator("li", { hasText: projectName });
  await expect(updatedRow.getByText(/0 of 1 tasks complete/i)).toBeVisible({ timeout: 10_000 });
});

test("[AC-014] with no projects in the workspace, the empty state invites creating the first project", async ({
  page,
}) => {
  // Mocks the network response for this page only (no real database
  // mutation, so this does not disturb other specs running in parallel) to
  // exercise the zero-projects branch of the overview, which the shared
  // seeded database never reaches on its own.
  await page.route("**/projects", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    } else {
      await route.continue();
    }
  });

  await signIn(page, MEMBER_A_EMAIL, MEMBER_A_PASSWORD);

  await expect(page.getByText(/no projects yet/i)).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByText(/create the first project to start organizing the team's work/i),
  ).toBeVisible();
  // The empty state itself offers a way to create the first project.
  await expect(page.getByRole("button", { name: "New project" }).last()).toBeVisible();
});

test("[AC-010] submitting the new-project form with a blank name shows an inline prompt and creates nothing", async ({
  page,
}) => {
  let createCalled = false;
  await page.route("**/projects", async (route) => {
    if (route.request().method() === "POST") {
      createCalled = true;
    }
    await route.continue();
  });

  await signIn(page, MEMBER_A_EMAIL, MEMBER_A_PASSWORD);

  await page.getByRole("button", { name: "New project" }).click();
  // Leave the name field blank and submit.
  await page.getByRole("button", { name: /create/i }).click();

  await expect(page.getByText(/give the project a name before you create it/i)).toBeVisible();
  expect(createCalled).toBe(false);

  // Whitespace-only is treated the same as blank.
  await page.getByLabel(/project name/i).fill("   ");
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(/give the project a name before you create it/i)).toBeVisible();
  expect(createCalled).toBe(false);
});
