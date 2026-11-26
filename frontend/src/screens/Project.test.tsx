import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Project from "@/screens/Project";
import { clearSession, setSession } from "@/lib/api";
import { setSelectedProjectId } from "@/lib/selectedProject";
import { queryClient } from "@/lib/queryClient";

function renderProject() {
  return render(
    <MemoryRouter initialEntries={["/project"]}>
      <Routes>
        <Route path="/project" element={<Project />} />
        <Route path="/projects" element={<div>Projects overview</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

const PROJECT = {
  id: "p-42",
  name: "Billing Migration",
  description: "Cut invoicing over from Stripe.",
  created_by: "u-other",
  created_at: "2026-09-01T00:00:00Z",
};

const TASKS = [
  {
    id: "t-1",
    project_id: "p-42",
    title: "Map legacy invoices",
    description: "",
    owner_id: null,
    due_date: "2026-11-01",
    status: "todo",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
];

function fetchRouter(overrides: Record<string, () => unknown> = {}) {
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const key = `${method} ${url.replace(/^.*(?=\/projects|\/tasks)/, "")}`;
    for (const pattern of Object.keys(overrides)) {
      if (key === pattern || url.endsWith(pattern)) {
        return Promise.resolve(jsonResponse(overrides[pattern]()));
      }
    }
    if (method === "GET" && url.includes("/tasks")) {
      return Promise.resolve(jsonResponse(TASKS));
    }
    if (method === "GET") {
      return Promise.resolve(jsonResponse(PROJECT));
    }
    return Promise.resolve(jsonResponse({}));
  });
}

describe("Project screen", () => {
  beforeEach(() => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedProjectId("p-42");
  });

  afterEach(() => {
    clearSession();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    queryClient.clear();
  });

  it("shows a loading state, then loads GET /projects/{id} and GET /projects/{id}/tasks and renders the tasks", async () => {
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    renderProject();

    expect(screen.getByText(/loading project/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Billing Migration")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.endsWith("/projects/p-42"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/projects/p-42/tasks"))).toBe(true);
  });

  it("shows an empty-board state when the project has no tasks", async () => {
    const fetchMock = fetchRouter({ "/projects/p-42/tasks": () => [] });
    vi.stubGlobal("fetch", fetchMock);

    renderProject();

    await waitFor(() => expect(screen.getByText("This board is empty")).toBeInTheDocument());
  });

  it("[AC-008] edits a task from a project the signed-in member did not create: changing status sends PATCH /tasks/{id} and the change is reflected after cache invalidation", async () => {
    let currentStatus = "todo";
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "PATCH" && url.endsWith("/tasks/t-1")) {
        const body = JSON.parse(init!.body as string);
        currentStatus = body.status;
        return Promise.resolve(jsonResponse({ ...TASKS[0], status: currentStatus }));
      }
      if (method === "GET" && url.endsWith("/tasks")) {
        return Promise.resolve(jsonResponse([{ ...TASKS[0], status: currentStatus }]));
      }
      return Promise.resolve(jsonResponse(PROJECT));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderProject();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /list/i }));
    const statusSelect = await screen.findByLabelText(/status for map legacy invoices/i);
    await user.selectOptions(statusSelect, "done");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/t-1"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        (init as RequestInit)?.method === "PATCH" && String(url).endsWith("/tasks/t-1"),
    );
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({ status: "done" });

    await waitFor(() => expect((statusSelect as HTMLSelectElement).value).toBe("done"));
  });

  it("[AC-008] edits a project the signed-in member did not create: saving sends PATCH /projects/{id} and the change is reflected after cache invalidation", async () => {
    let currentName = "Billing Migration";
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "PATCH" && url.endsWith("/projects/p-42")) {
        const body = JSON.parse(init!.body as string);
        currentName = body.name;
        return Promise.resolve(jsonResponse({ ...PROJECT, name: currentName }));
      }
      if (method === "GET" && url.includes("/tasks")) {
        return Promise.resolve(jsonResponse(TASKS));
      }
      if (method === "GET") {
        return Promise.resolve(jsonResponse({ ...PROJECT, name: currentName }));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderProject();

    await waitFor(() => expect(screen.getByText("Billing Migration")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /edit project/i }));
    const nameInput = await screen.findByLabelText(/^Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Billing Migration v2");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/projects/p-42"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );

    await waitFor(() => expect(screen.getByText("Billing Migration v2")).toBeInTheDocument());
  });

  it("does not hide or disable editing based on who created the project or task", async () => {
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    renderProject();

    await waitFor(() => expect(screen.getByText("Billing Migration")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /edit project/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /new task/i })).toBeEnabled();
  });
});
