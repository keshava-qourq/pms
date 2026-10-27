import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Team from "@/screens/Team";
import { clearSession } from "@/lib/api";

function renderTeam() {
  return render(
    <MemoryRouter initialEntries={["/team"]}>
      <Routes>
        <Route path="/team" element={<Team />} />
        <Route path="/projects" element={<div>Projects overview</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fetchMockFor({ me, invite }: { me: unknown; invite?: { status: number; body: unknown } }) {
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (String(url).includes("/auth/me")) {
      return Promise.resolve({ ok: true, status: 200, json: async () => me });
    }
    if (String(url).includes("/invitations") && init?.method === "POST") {
      const result = invite ?? { status: 200, body: {} };
      return Promise.resolve({
        ok: result.status < 300,
        status: result.status,
        json: async () => result.body,
      });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
  });
}

describe("Team", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    clearSession();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("[AC-004] shows the invite form for an administrator, sends POST /invitations and shows the recorded invitation", async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const invitation = {
      id: "inv-1",
      email: "new.hire@example.com",
      token: "tok-123",
      invited_by: "u-01",
      accepted: false,
      created_at: "2026-10-26T09:00:00Z",
      expires_at: "2026-11-02T09:00:00Z",
    };
    const fetchMock = fetchMockFor({
      me: { id: "u-01", email: "admin@example.com", is_admin: true },
      invite: { status: 201, body: invitation },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderTeam();

    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email address/i), "new.hire@example.com");
    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/invitations"),
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await waitFor(() => expect(screen.getByText(/invitation sent/i)).toBeInTheDocument());
    expect(screen.getByText("new.hire@example.com")).toBeInTheDocument();
  });

  it("[AC-005] does not render the invite form or any invite entry point for a non-administrator", async () => {
    const fetchMock = fetchMockFor({
      me: { id: "u-03", email: "member@example.com", is_admin: false },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderTeam();

    await waitFor(() =>
      expect(screen.getByText(/inviting is an administrator task/i)).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send invitation/i })).not.toBeInTheDocument();
  });

  it("[AC-006] shows an already-exists message on a 409 from POST /invitations", async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const fetchMock = fetchMockFor({
      me: { id: "u-01", email: "admin@example.com", is_admin: true },
      invite: { status: 409, body: { detail: "already exists" } },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderTeam();
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email address/i), "existing@example.com");
    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    await waitFor(() => expect(screen.getByText(/already a member/i)).toBeInTheDocument());
  });

  it("[AC-006] shows a not-permitted message on a 403 from POST /invitations", async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const fetchMock = fetchMockFor({
      me: { id: "u-01", email: "admin@example.com", is_admin: true },
      invite: { status: 403, body: { detail: "forbidden" } },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderTeam();
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email address/i), "someone@example.com");
    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    await waitFor(() => expect(screen.getByText(/not permitted/i)).toBeInTheDocument());
  });

  it("removes seeded sample invitation data", async () => {
    const fetchMock = fetchMockFor({
      me: { id: "u-01", email: "admin@example.com", is_admin: true },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderTeam();

    await waitFor(() => expect(screen.getByText(/no invitations waiting/i)).toBeInTheDocument());
    expect(screen.queryByText(/lena.fischer@northbay.co/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sam.ferreira@northbay.co/i)).not.toBeInTheDocument();
  });
});
