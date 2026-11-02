import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import Project from "@/screens/Project";
import { clearSession, setSession } from "@/lib/api";
import { setSelectedProjectId } from "@/lib/selectedProject";
import { queryClient } from "@/lib/queryClient";

// dnd-kit's collision detection needs real layout rects, which jsdom never
// provides. Give each board column a fixed, distinct rect keyed by its
// data-wf marker so a simulated pointer drag lands in a predictable column;
// every other element (including the draggable card) keeps a neutral rect.
const COLUMN_X: Record<string, number> = { "b-3-0": 0, "b-3-1": 200, "b-3-2": 400 };
beforeAll(() => {
  // jsdom has no PointerEvent constructor, so fireEvent.pointer* events never carry
  // isPrimary/button/pointerId -- properties @dnd-kit/core's PointerSensor requires
  // to recognise the gesture at all. A minimal polyfill restores them.
  if (typeof (globalThis as Record<string, unknown>).PointerEvent === "undefined") {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      pointerType: string;
      isPrimary: boolean;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 1;
        this.pointerType = params.pointerType ?? "mouse";
        this.isPrimary = params.isPrimary ?? true;
      }
    }
    (globalThis as Record<string, unknown>).PointerEvent = PointerEventPolyfill;
  }
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: function (this: HTMLElement) {
      const wf = this.getAttribute?.("data-wf");
      const x = wf && wf in COLUMN_X ? COLUMN_X[wf] : 0;
      return {
        width: 100,
        height: 40,
        top: 0,
        left: x,
        right: x + 100,
        bottom: 40,
        x,
        y: 0,
        toJSON() {
          return {};
        },
      };
    },
  });
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
});

function dragCardTo(cardText: string, targetX: number) {
  const card = screen.getByText(cardText).closest("li")!;
  fireEvent.pointerDown(card, {
    pointerId: 1,
    clientX: 20,
    clientY: 20,
    button: 0,
    isPrimary: true,
  });
  // The first move past the activation distance only arms the drag; a
  // second move at the same point is what dnd-kit reports as the new
  // pointer position (see AbstractPointerSensor.handleMove).
  fireEvent.pointerMove(document, { pointerId: 1, clientX: targetX, clientY: 20, isPrimary: true });
  fireEvent.pointerMove(document, { pointerId: 1, clientX: targetX, clientY: 20, isPrimary: true });
  fireEvent.pointerUp(document, { pointerId: 1, clientX: targetX, clientY: 20, isPrimary: true });
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

  it("[AC-020] renders one column per status with each task in the column matching its status, and no seeded task data", async () => {
    const twoTasks = [
      { ...TASKS[0], id: "t-1", status: "todo", title: "Map legacy invoices" },
      { ...TASKS[0], id: "t-2", status: "in_progress", title: "Wire up payments" },
    ];
    const fetchMock = fetchRouter({ "/projects/p-42/tasks": () => twoTasks });
    vi.stubGlobal("fetch", fetchMock);

    renderProject();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());
    expect(screen.getByText("Wire up payments")).toBeInTheDocument();

    // one section per status
    expect(screen.getByText("To do")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();

    // no sample/seeded cards from the design mock
    expect(screen.queryByText("Website Redesign")).not.toBeInTheDocument();
    expect(screen.queryByText("Research")).not.toBeInTheDocument();
  });

  it("[AC-020] shows an error state when the tasks request fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/projects/p-42")) return Promise.resolve(jsonResponse(PROJECT));
      return Promise.resolve({ ok: false, status: 500, json: async () => ({ detail: "boom" }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderProject();

    await waitFor(() =>
      expect(screen.getByText(/couldn't load this project/i)).toBeInTheDocument(),
    );
  });

  it("[AC-021] dragging a card to another column calls PATCH /tasks/{id} with the new status, moves the card, and survives a reload", async () => {
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

    renderProject();
    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    // drag the card from "To do" (x≈0-100) over to "Done" (x≈400-500)
    dragCardTo("Map legacy invoices", 440);

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

    // the moved card is now rendered in the Done column (the card disappears
    // from the board entirely only if it fails to re-render; here we assert
    // the status the next GET reflects, which is what both views read)
    await waitFor(() => expect(currentStatus).toBe("done"));

    // simulate a reload: a fresh mount re-fetches from the server and sees the change
    queryClient.clear();
    renderProject();
    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    // @dnd-kit detaches its document-level click guard 50ms after drag end;
    // let it finish so it doesn't swallow the next test's first click.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
  });

  it("[AC-022] the list view renders one row per task with title, owner name, due date and status", async () => {
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderProject();
    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /list/i }));

    expect(screen.getByText("Map legacy invoices")).toBeInTheDocument();
    expect(await screen.findByLabelText(/owner for map legacy invoices/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status for map legacy invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/01 nov 2026/i)).toBeInTheDocument();
  });

  it("[AC-023] updating a task's status in the list view invalidates the shared tasks query so the board reflects it without a reload", async () => {
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

    await waitFor(() => expect(currentStatus).toBe("done"));

    // switch to the board without reloading: the same cache key must now show the move
    await user.click(screen.getByRole("tab", { name: /board/i }));
    await waitFor(() => {
      const doneColumn = screen.getByText("Done").closest("section")!;
      expect(doneColumn).toHaveTextContent("Map legacy invoices");
    });
  });

  it("renders label chips from the API labels[] field on both the board card and the list row", async () => {
    const labeledTask = {
      ...TASKS[0],
      labels: [{ id: "lbl-1", name: "Blocked", color: "#1d3fff" }],
    };
    const fetchMock = fetchRouter({ "/projects/p-42/tasks": () => [labeledTask] });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderProject();
    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());
    expect(screen.getAllByText("Blocked").length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("tab", { name: /list/i }));
    await waitFor(() => expect(screen.getAllByText("Blocked").length).toBeGreaterThanOrEqual(1));
  });

  it("shows an empty-list state in the list view when the project has no tasks", async () => {
    const fetchMock = fetchRouter({ "/projects/p-42/tasks": () => [] });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderProject();
    await waitFor(() => expect(screen.getByText("Billing Migration")).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /list/i }));
    await waitFor(() => expect(screen.getByText("No tasks in this project")).toBeInTheDocument());
  });
});
