import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AcceptInvite from "@/screens/AcceptInvite";
import { clearSession, getToken, getUser } from "@/lib/api";

function renderAcceptInvite(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/projects" element={<div>Projects overview</div>} />
        <Route path="/sign-in" element={<div>Sign in screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), "Jamie Rivera");
  await user.type(screen.getByLabelText(/^password$/i), "correct-horse-battery");
  await user.type(screen.getByLabelText(/confirm password/i), "correct-horse-battery");
}

describe("AcceptInvite", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    clearSession();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("[AC-004] reads the token from the URL, posts to /auth/accept-invite, stores the session and lands on projects", async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "jwt-invite-1",
        user: { id: "u9", email: "jamie@example.com", name: "Jamie Rivera" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAcceptInvite("/accept-invite?token=abc-123");

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/auth/accept-invite");
    const body = JSON.parse(init.body);
    expect(body.token).toBe("abc-123");
    expect(body.password).toBe("correct-horse-battery");

    await waitFor(() => expect(getToken()).toBe("jwt-invite-1"));
    expect(getUser()).toEqual({ id: "u9", email: "jamie@example.com", name: "Jamie Rivera" });

    await vi.advanceTimersByTimeAsync(700);
    await waitFor(() => expect(screen.getByText("Projects overview")).toBeInTheDocument());
  });

  it("shows an error instead of success for an expired or invalid token", async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 410,
      json: async () => ({ detail: "expired" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAcceptInvite("/accept-invite?token=expired-token");

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/account created/i)).not.toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it("shows an error instead of a form when there is no token in the URL", () => {
    renderAcceptInvite("/accept-invite");

    expect(screen.getByText(/this invitation link doesn't work/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it("removes seeded sample invite data", () => {
    renderAcceptInvite("/accept-invite?token=abc-123");

    expect(screen.queryByText(/anna.reed@northbay.co/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dana whitfield/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/northbay studio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/seats used/i)).not.toBeInTheDocument();
  });
});
