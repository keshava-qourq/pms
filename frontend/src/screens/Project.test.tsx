import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Project from "@/screens/Project";
import { clearSession, setSession } from "@/lib/api";
import { setSelectedProjectId } from "@/lib/selectedProject";
import { queryClient } from "@/lib/queryClient";

/** Parses an rgb()/rgba() computed colour; anything else (transparent, none,
 * currentcolor fallbacks) carries no hue and is treated as achromatic. */
function isAchromaticColor(value: string): boolean {
  const m = /rgba?\(([^)]+)\)/.exec(value);
  if (!m) return true;
  const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
  const [r, g, b, a] = parts;
  if (a === 0) return true;
  return r === g && g === b;
}

/** Walks an element and its descendants and asserts every computed color,
 * background and border colour is achromatic -- black, white or grey, never
 * a hue. Mirrors the same helper in Task.test.tsx. */
function assertAchromatic(container: Element) {
  const props = [
    "color",
    "backgroundColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
  ] as const;
  const violations: string[] = [];
  container.querySelectorAll("*").forEach((el) => {
    const cs = getComputedStyle(el as HTMLElement);
    for (const prop of props) {
      const value = cs[prop];
      if (!isAchromaticColor(value)) {
        violations.push(`${el.tagName}.${(el as HTMLElement).className}: ${prop}=${value}`);
      }
    }
  });
  expect(violations).toEqual([]);
}

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

  it("[AC-037] the Kanban board's columns and cards render using only black, white and grey tones", async () => {
    const tasks = [
      { ...TASKS[0], id: "t-1", title: "Map legacy invoices", status: "todo" },
      { ...TASKS[0], id: "t-2", title: "Wire up webhooks", status: "in_progress" },
      { ...TASKS[0], id: "t-3", title: "Close out Stripe", status: "done" },
    ];
    const fetchMock = fetchRouter({ "/projects/p-42/tasks": () => tasks });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = renderProject();

    await waitFor(() => expect(screen.getByText("Close out Stripe")).toBeInTheDocument());

    // The board is the default view (no tab switch needed): every colour --
    // text, background and border -- on its columns and cards is black,
    // white or grey. No hue survives anywhere on the rendered board.
    assertAchromatic(container);
  });

  it("[AC-038] distinguishes the status columns from each other with shading and labels, not colour alone", async () => {
    const tasks = [
      { ...TASKS[0], id: "t-1", title: "Todo task", status: "todo" },
      { ...TASKS[0], id: "t-2", title: "Doing task", status: "in_progress" },
      { ...TASKS[0], id: "t-3", title: "Done task", status: "done" },
    ];
    const fetchMock = fetchRouter({ "/projects/p-42/tasks": () => tasks });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = renderProject();

    await waitFor(() => expect(screen.getByText("Done task")).toBeInTheDocument());

    const todoColumn = container.querySelector('[data-wf="b-3-0"]') as HTMLElement;
    const doingColumn = container.querySelector('[data-wf="b-3-1"]') as HTMLElement;
    const doneColumn = container.querySelector('[data-wf="b-3-2"]') as HTMLElement;
    expect(todoColumn).toBeTruthy();
    expect(doingColumn).toBeTruthy();
    expect(doneColumn).toBeTruthy();

    // Label cue: each column names its own status.
    expect(within(todoColumn).getByText("To do")).toBeInTheDocument();
    expect(within(doingColumn).getByText("In progress")).toBeInTheDocument();
    expect(within(doneColumn).getByText("Done")).toBeInTheDocument();

    // Shading cue: each column has its own grey tone, every one of them
    // achromatic, and no two of the three are the same shade.
    const shades = [todoColumn, doingColumn, doneColumn].map(
      (col) => getComputedStyle(col).backgroundColor,
    );
    shades.forEach((shade) => expect(isAchromaticColor(shade)).toBe(true));
    expect(new Set(shades).size).toBe(3);
  });

  it("[AC-039] moving a task card to another column updates its visual status cue and persists the new status", async () => {
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
    const { container } = renderProject();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    const todoColumn = container.querySelector('[data-wf="b-3-0"]') as HTMLElement;
    expect(within(todoColumn).getByText("Map legacy invoices")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /move .*map legacy invoices.* to in progress/i }),
    );

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
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      status: "in_progress",
    });

    // The card moved to the "In progress" column -- its new status is
    // reflected visually there (and the change persisted via PATCH above),
    // all while the whole board remains achromatic.
    await waitFor(() => {
      const inProgressColumn = container.querySelector('[data-wf="b-3-1"]') as HTMLElement;
      expect(within(inProgressColumn).getByText("Map legacy invoices")).toBeInTheDocument();
    });
    const todoColumnAfter = container.querySelector('[data-wf="b-3-0"]') as HTMLElement;
    expect(within(todoColumnAfter).queryByText("Map legacy invoices")).not.toBeInTheDocument();

    assertAchromatic(container);
  });
});
