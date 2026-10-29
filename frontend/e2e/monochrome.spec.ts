import { execSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

// Same seeded demo member every other e2e file in this suite relies on
// (app.seed.seed_demo_user) -- a known-password account for the sign-in flow.
const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "demo@example.com";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

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

/** Fresh, valid accept-invite token: lets us render the full (non-"invalid link") form. */
function seedInviteToken(email: string): string {
  return runPython(`
import uuid
from datetime import UTC, datetime, timedelta

from app.database import SessionLocal
from app.models import Invitation, User
from app.security import hash_password

db = SessionLocal()
admin = db.query(User).filter(User.is_admin.is_(True)).first()
if admin is None:
    admin = User(email="admin-mono@example.com", password_hash=hash_password("x"), is_admin=True)
    db.add(admin)
    db.commit()
    db.refresh(admin)

tok = uuid.uuid4().hex
inv = Invitation(
    email="${email}",
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
}

type Violation = { tag: string; cls: string; prop: string; value: string };

/**
 * Walks every rendered element and asserts its computed color, background-color
 * and border-*-color are achromatic (r==g==b, including fully transparent values,
 * which carry no hue). Deliberately colour-agnostic: it never compares against a
 * specific rgb() value, so it stays green across tone/shade tweaks and only fails
 * when a hue-bearing colour (non-grey r/g/b) is introduced.
 */
async function assertPageIsAchromatic(page: Page) {
  const violations: Violation[] = await page.evaluate(() => {
    function isAchromatic(colorStr: string): boolean {
      const m = colorStr.match(/rgba?\(([^)]+)\)/);
      if (!m) return true; // "transparent", "none", currentcolor fallbacks, etc.
      const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
      const [r, g, b, a] = parts;
      if (a === 0) return true; // invisible: no perceivable hue
      return r === g && g === b;
    }

    const props = [
      "color",
      "backgroundColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
    ] as const;

    const bad: Violation[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      for (const prop of props) {
        const value = cs[prop];
        if (!isAchromatic(value)) {
          bad.push({
            tag: el.tagName,
            cls: typeof el.className === "string" ? el.className : "",
            prop,
            value,
          });
        }
      }
    });
    return bad;
  });

  expect(violations, JSON.stringify(violations.slice(0, 5))).toEqual([]);
}

for (const vp of VIEWPORTS) {
  test(`[AC-031] sign-in screen is achromatic at ${vp.name} (${vp.width}x${vp.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /Sign in to/i })).toBeVisible();
    await assertPageIsAchromatic(page);
  });

  test(`[AC-031] accept-invite screen is achromatic at ${vp.name} (${vp.width}x${vp.height})`, async ({
    page,
  }) => {
    const token = seedInviteToken(`mono-${vp.name}-${Date.now()}@example.com`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`/accept-invite?token=${token}`);
    await expect(page.getByRole("heading", { name: "Accept your invitation" })).toBeVisible();
    await assertPageIsAchromatic(page);
  });

  test(`[AC-031] accept-invite invalid-link state is achromatic at ${vp.name} (${vp.width}x${vp.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/accept-invite?token=not-a-real-token");
    await expect(page.getByText(/doesn't work|invalid or has expired/i)).toBeVisible();
    await assertPageIsAchromatic(page);
  });
}

test("[AC-032] the invalid-credentials error is distinguishable from the idle state without colour, and stays achromatic", async ({
  page,
}) => {
  await page.goto("/sign-in");

  const liveRegion = page.locator('[aria-live="polite"]').first();
  await expect(liveRegion).toHaveAttribute("aria-live", "polite");

  // Idle-state signals, captured before any submission.
  const idleMessage = liveRegion.locator("p").first();
  const idleStyle = await idleMessage.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontWeight: cs.fontWeight, backgroundColor: cs.backgroundColor };
  });

  await page.getByLabel("Email address").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/those credentials are invalid/i);

  const errorStyle = await alert.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontWeight: cs.fontWeight, backgroundColor: cs.backgroundColor, color: cs.color };
  });

  // Non-colour distinction #1: heavier type weight than the idle message.
  expect(Number(errorStyle.fontWeight)).toBeGreaterThan(Number(idleStyle.fontWeight) || 400);

  // Non-colour distinction #2: a solid fill where the idle state had none
  // (background inversion), not a colour change -- both fills are achromatic.
  expect(errorStyle.backgroundColor).not.toBe(idleStyle.backgroundColor);
  const idleIsFilled = /rgba?\(([^)]+)\)/.exec(idleStyle.backgroundColor);
  const idleAlpha = idleIsFilled ? parseFloat(idleIsFilled[1].split(",")[3] ?? "1") : 0;
  expect(idleAlpha === 0 || idleStyle.backgroundColor === "transparent").toBe(true);

  // The error region's own colours remain achromatic even though it is now filled.
  for (const value of [errorStyle.backgroundColor, errorStyle.color]) {
    const m = /rgba?\(([^)]+)\)/.exec(value);
    if (!m) continue;
    const [r, g, b] = m[1].split(",").map((s) => parseFloat(s.trim()));
    expect(r).toBe(g);
    expect(g).toBe(b);
  }

  // The whole page -- including the freshly rendered error -- stays monochrome.
  await assertPageIsAchromatic(page);

  // Error text is genuinely announced/visible, not just present in the DOM.
  await expect(alert).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});
