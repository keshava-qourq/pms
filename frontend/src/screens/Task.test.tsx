import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Task from "@/screens/Task";
import { clearSession, setSession } from "@/lib/api";
import { setSelectedTaskId } from "@/lib/selectedTask";
import { queryClient } from "@/lib/queryClient";

function renderTask() {
  return render(
    <MemoryRouter initialEntries={["/task"]}>
      <Routes>
        <Route path="/task" element={<Task />} />
        <Route path="/project" element={<div>Project workspace</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

const DETAIL = {
  task: {
    id: "t-1",
    project_id: "p-42",
    title: "Map legacy invoices",
    description: "Trace every invoice source.",
    owner_id: null,
    due_date: "2026-11-01",
    status: "todo",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  comments: [],
  checklist: [],
  labels: [],
};

describe("Task screen", () => {
  afterEach(() => {
    clearSession();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    queryClient.clear();
  });

  it("shows a 'no task selected' empty state when nothing was opened", () => {
    setSession("jwt-1", { id: "u1" });
    renderTask();
    expect(screen.getByText(/no task selected/i)).toBeInTheDocument();
  });

  it("shows a loading state, then loads GET /tasks/{id} and renders the task", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DETAIL));
    vi.stubGlobal("fetch", fetchMock);

    renderTask();

    expect(screen.getByText(/loading task/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());
    expect(fetchMock.mock.calls[0][0]).toContain("/tasks/t-1");
  });

  it("shows an error state when the task fails to load", async () => {
    setSession("jwt-1", { id: "u1" });
    setSelectedTaskId("t-1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "nope" }, 500)));

    renderTask();

    await waitFor(() => expect(screen.getByText(/couldn't load this task/i)).toBeInTheDocument());
  });

  it("[AC-017] blocks saving a blank title with an inline message and sends no request", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DETAIL));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderTask();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    const titleInput = screen.getByLabelText(/^title$/i);
    await user.clear(titleInput);
    // dirty but still disabled while blank is caught by validation on submit;
    // directly attempt a submit via the form button once it's enabled by any change
    await user.type(titleInput, "x");
    await user.clear(titleInput);

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    expect(await screen.findByText(/needs a title/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit)?.method === "PATCH")).toBe(
      false,
    );
  });

  it("[AC-018/AC-019] changing status, owner and due date sends one PATCH /tasks/{id} with the new values, reflected after cache invalidation", async () => {
    let current = { ...DETAIL.task };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "PATCH" && url.endsWith("/tasks/t-1")) {
        const body = JSON.parse(init!.body as string);
        current = { ...current, ...body };
        return Promise.resolve(jsonResponse(current));
      }
      return Promise.resolve(
        jsonResponse({ task: current, comments: [], checklist: [], labels: [] }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    setSession("jwt-1", { id: "u9", email: "rhea@example.com", name: "Rhea Okafor" });
    setSelectedTaskId("t-1");

    const user = userEvent.setup();
    renderTask();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText(/status/i), "done");
    await user.selectOptions(screen.getByLabelText(/owner/i), "u9");
    const dueInput = screen.getByLabelText(/due date/i);
    await user.clear(dueInput);
    await user.type(dueInput, "2026-12-15");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/t-1"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) => (init as RequestInit)?.method === "PATCH" && String(url).endsWith("/tasks/t-1"),
    );
    const body = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(body).toMatchObject({ status: "done", owner_id: "u9", due_date: "2026-12-15" });

    await waitFor(() => expect(screen.getByText(/all changes saved/i)).toBeInTheDocument());
  });

  it("removes seeded sample task, owner and status data", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(DETAIL)));

    renderTask();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());
    expect(screen.queryByText(/priya nandakumar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tom ek/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/audit current sitemap/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/website redesign/i)).not.toBeInTheDocument();
  });
});
