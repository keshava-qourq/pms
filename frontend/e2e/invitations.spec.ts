import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

// The admin seed is the same idempotent demo member every other e2e file relies on
// (app.seed.seed_demo_user is_admin=True).
const ADMIN_EMAIL = process.env.SEED_USER_EMAIL ?? "demo@example.com";
const ADMIN_PASSWORD = process.env.SEED_USER_PASSWORD ?? "password123";

// A second, non-admin member, seeded directly in the backend's own database the same
// way auth.spec.ts seeds the admin: there is no public sign-up route, so this is the
// supported way to get a known-password account into the database before the run.
const MEMBER_EMAIL = "member-e2e@example.com";
const MEMBER_PASSWORD = "member-password-123";

// Runs a short Python script against the backend's own database, piped in over stdin
// (rather than `-c`) so multi-line statements such as `if` blocks do not need to be
// squeezed onto one semicolon-joined line.
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

  // Idempotent: only inserts the non-admin member if that email is not already there.
  runPython(`
from app.database import SessionLocal
from app.models import User
from app.security import hash_password

db = SessionLocal()
existing = db.query(User).filter(User.email == "${MEMBER_EMAIL}").first()
if existing is None:
    db.add(
        User(
            email="${MEMBER_EMAIL}",
            password_hash=hash_password("${MEMBER_PASSWORD}"),
            name="E2E Member",
            is_admin=False,
        )
    )
    db.commit()
db.close()
`);
});

async function signIn(page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/, { timeout: 5000 });
}

test("[AC-004] an admin sends an invite and sees it recorded", async ({ page }) => {
  const inviteEmail = `invitee-${Date.now()}@example.com`;

  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/team");

  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();

  await page.getByLabel("Email address").fill(inviteEmail);
  await page.getByRole("button", { name: /Send invitation/i }).click();

  await expect(page.getByText(/Invitation sent/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /Pending invitations/i })).toBeVisible();
  await expect(page.getByText(inviteEmail)).toBeVisible();
});

test("[AC-005] a non-admin member sees no invite control anywhere on the Team screen", async ({
  page,
}) => {
  await signIn(page, MEMBER_EMAIL, MEMBER_PASSWORD);
  await page.goto("/team");

  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();

  // Give the is_admin check (GET /auth/me) time to resolve before asserting absence.
  await expect(page.getByText(/Inviting is an administrator task/i)).toBeVisible({
    timeout: 10_000,
  });

  await expect(page.getByLabel("Email address")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Send invitation/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Pending invitations/i })).toHaveCount(0);
});

test("[AC-004] the invitee opens the invite link, sets a password and reaches the projects overview", async ({
  page,
}) => {
  const inviteEmail = `invitee-journey-${Date.now()}@example.com`;

  // Create the invitation the same way the admin flow does (directly against the
  // database, bypassing SendGrid): the token is emailed out-of-band in production, so
  // the only supported way to get it here is to read it back from the database.
  const token = runPython(`
import uuid
from datetime import UTC, datetime, timedelta

from app.database import SessionLocal
from app.models import Invitation, User
from app.security import hash_password

db = SessionLocal()
admin = db.query(User).filter(User.is_admin.is_(True)).first()
if admin is None:
    admin = User(email="admin-e2e@example.com", password_hash=hash_password("x"), is_admin=True)
    db.add(admin)
    db.commit()
    db.refresh(admin)

tok = uuid.uuid4().hex
inv = Invitation(
    email="${inviteEmail}",
    token=tok,
    status="pending",
    invited_by=admin.id,
    expires_at=datetime.now(UTC) + timedelta(days=7),
)
db.add(inv)
db.commit()
print(tok)
db.close()
`);

  await page.goto(`/accept-invite?token=${token}`);

  await expect(page.getByRole("heading", { name: "Accept your invitation" })).toBeVisible();

  await page.getByLabel("Full name").fill("Invited Journey Member");
  await page.getByLabel("Password", { exact: true }).fill("a-strong-password-99");
  await page.getByLabel("Confirm password").fill("a-strong-password-99");
  await page.getByRole("button", { name: /Create account/i }).click();

  await expect(page.getByText(/Account created/i)).toBeVisible();
  await expect(page).toHaveURL(/\/projects$/, { timeout: 5000 });
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
});
