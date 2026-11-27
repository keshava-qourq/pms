import { expect, test } from "@playwright/test";

import { adminCredentials } from "./support/admin";

// GET /notifications has no screen in this app (there is no notifications bell or
// list anywhere in frontend/src/screens) -- it is a pure API guarantee a client
// could still depend on, so it is driven through Playwright's `request` API
// rather than the browser. `baseURL` is the frontend; the API lives separately.
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

async function signInViaApi(request: import("@playwright/test").APIRequestContext) {
  const { email, password } = adminCredentials();
  const response = await request.post(`${API}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  return body.access_token as string;
}

test("[API-NOTIFICATIONS] GET /notifications requires a bearer token", async ({ request }) => {
  const response = await request.get(`${API}/notifications`);
  expect(response.status()).toBe(401);
});

test("[API-NOTIFICATIONS] a signed-in member gets their notifications back as a list", async ({
  request,
}) => {
  const token = await signInViaApi(request);

  const response = await request.get(`${API}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
});

test("[API-NOTIFICATIONS] an invalid bearer token is rejected rather than silently ignored", async ({
  request,
}) => {
  const response = await request.get(`${API}/notifications`, {
    headers: { Authorization: "Bearer not-a-real-token" },
  });
  expect(response.status()).toBe(401);
});
