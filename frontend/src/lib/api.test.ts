import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, clearSession, getToken, isAuthenticated, setSession } from "@/lib/api";

describe("apiFetch", () => {
  afterEach(() => {
    clearSession();
    vi.unstubAllGlobals();
  });

  it("attaches the stored JWT as the Authorization bearer", async () => {
    setSession("jwt-123", { id: "u1" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/projects");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer jwt-123");
  });

  it("on a 401 response clears the session", async () => {
    setSession("jwt-123", { id: "u1" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "expired" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/projects")).rejects.toBeInstanceOf(ApiError);
    expect(isAuthenticated()).toBe(false);
    expect(getToken()).toBeNull();
  });

  it("does not clear an (absent) session on a 401 from /auth/login itself", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid credentials" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch("/auth/login", { method: "POST", body: "{}" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(isAuthenticated()).toBe(false);
  });
});
