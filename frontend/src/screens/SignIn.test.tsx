import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SignIn from "@/screens/SignIn";
import { clearSession, getToken, getUser } from "@/lib/api";

function renderSignIn(initialEntries: string[] = ["/sign-in"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/projects" element={<div>Projects overview</div>} />
        <Route path="/task" element={<div>Task detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SignIn", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    clearSession();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("[AC-001] submits email and password to POST /auth/login, stores the session and lands on projects", async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "jwt-abc",
        token_type: "bearer",
        user: { id: "u1", email: "rhea.okafor@meridian.works", name: "Rhea Okafor" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSignIn();

    await user.type(screen.getByLabelText(/email address/i), "rhea.okafor@meridian.works");
    await user.type(screen.getByLabelText(/password/i), "northline-42");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/auth/login");
    expect(JSON.parse(init.body)).toEqual({
      email: "rhea.okafor@meridian.works",
      password: "northline-42",
    });

    await waitFor(() => expect(getToken()).toBe("jwt-abc"));
    expect(getUser()).toEqual({
      id: "u1",
      email: "rhea.okafor@meridian.works",
      name: "Rhea Okafor",
    });

    await vi.advanceTimersByTimeAsync(700);
    await waitFor(() => expect(screen.getByText("Projects overview")).toBeInTheDocument());
  });

  it("[AC-002] shows the invalid-credentials error on 401, stays on the page and stores no token", async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid credentials" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSignIn();

    await user.type(screen.getByLabelText(/email address/i), "rhea.okafor@meridian.works");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/those credentials are invalid/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it("removes the seeded demo-credentials hint", () => {
    renderSignIn();
    expect(screen.queryByText(/demo account/i)).not.toBeInTheDocument();
  });

  it("[AC-003] after signing in via a redirect, lands back on the originally requested page", async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "jwt-xyz",
        token_type: "bearer",
        user: { id: "u1", email: "rhea.okafor@meridian.works" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/sign-in", state: { from: { pathname: "/task" } } }]}
      >
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/task" element={<div>Task detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email address/i), "rhea.okafor@meridian.works");
    await user.type(screen.getByLabelText(/password/i), "northline-42");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await vi.advanceTimersByTimeAsync(700);
    await waitFor(() => expect(screen.getByText("Task detail")).toBeInTheDocument());
  });
});
