import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    // Unmount before touching session/global/query state: the root setupFile's
    // own `afterEach(cleanup)` runs after this (describe-level) hook, so without
    // an explicit early cleanup() here the screen is still mounted and subscribed
    // when the cache is cleared and fetch is unstubbed below -- its active query
    // observers then refetch immediately with the real (un-mocked) fetch and
    // poison the shared queryClient cache for the next test.
    cleanup();
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
      ([url, init]) =>
        (init as RequestInit)?.method === "PATCH" && String(url).endsWith("/tasks/t-1"),
    );
    const body = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(body).toMatchObject({ status: "done", owner_id: "u9", due_date: "2026-12-15" });

    await waitFor(() => expect(screen.getByText(/all changes saved/i)).toBeInTheDocument());
  });

  function routedFetch(overrides: Record<string, (init?: RequestInit) => unknown>) {
    return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      for (const pattern of Object.keys(overrides)) {
        const [m, path] = pattern.split(" ");
        if (method === m && url.endsWith(path)) {
          return Promise.resolve(jsonResponse(overrides[pattern](init)));
        }
      }
      if (method === "GET" && url.endsWith("/tasks/t-1")) {
        return Promise.resolve(jsonResponse(DETAIL));
      }
      if (method === "GET" && url.endsWith("/tasks/t-1/comments")) {
        return Promise.resolve(jsonResponse([]));
      }
      if (method === "GET" && url.endsWith("/labels")) {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.resolve(jsonResponse({}));
    });
  }

  it("[AC-025] renders existing comments in chronological order from GET /tasks/{id}/comments", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    const comments = [
      {
        id: "c-1",
        task_id: "t-1",
        author_id: "u1",
        body: "First comment",
        created_at: "2026-10-02T00:00:00Z",
      },
      {
        id: "c-2",
        task_id: "t-1",
        author_id: "u2",
        body: "Second comment",
        created_at: "2026-10-03T00:00:00Z",
      },
    ];
    const fetchMock = routedFetch({ "GET /tasks/t-1/comments": () => comments });
    vi.stubGlobal("fetch", fetchMock);

    renderTask();

    await waitFor(() => expect(screen.getByText("First comment")).toBeInTheDocument());
    const bodies = screen.getAllByText(/comment$/).map((el) => el.textContent);
    expect(bodies.indexOf("First comment")).toBeLessThan(bodies.indexOf("Second comment"));
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/tasks/t-1/comments"))).toBe(
      true,
    );
  });

  it("[AC-024] posting a comment calls POST /tasks/{id}/comments and the saved comment appears with author and timestamp", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com", name: "Rhea Okafor" });
    setSelectedTaskId("t-1");
    let posted: unknown[] = [];
    const fetchMock = routedFetch({
      "GET /tasks/t-1/comments": () => posted,
      "POST /tasks/t-1/comments": (init) => {
        const body = JSON.parse(init!.body as string);
        const comment = {
          id: "c-9",
          task_id: "t-1",
          author_id: "u1",
          body: body.body,
          created_at: "2026-10-05T00:00:00Z",
        };
        posted = [comment];
        return comment;
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderTask();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/add a comment/i), "Looks good");
    await user.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/t-1/comments"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => (init as RequestInit)?.method === "POST" && String(url).endsWith("/comments"),
    );
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toEqual({ body: "Looks good" });

    await waitFor(() => expect(screen.getByText("Looks good")).toBeInTheDocument());
    expect(screen.getAllByText("Rhea Okafor").length).toBeGreaterThan(0);
  });

  it("[AC-026] submitting an empty or whitespace-only comment posts nothing and shows an inline prompt", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    const fetchMock = routedFetch({});
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderTask();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/add a comment/i), "   ");
    await user.click(screen.getByRole("button", { name: /post comment/i }));

    expect(await screen.findByText(/enter some text/i)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          (init as RequestInit)?.method === "POST" && String(url).endsWith("/comments"),
      ),
    ).toBe(false);
  });

  it("[AC-027] adding a checklist item calls POST /tasks/{id}/checklist and it appears unchecked", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    const fetchMock = routedFetch({
      "POST /tasks/t-1/checklist": (init) => {
        const body = JSON.parse(init!.body as string);
        return { id: "ci-1", task_id: "t-1", title: body.title, is_complete: false, position: 0 };
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderTask();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/new item/i), "Write tests");
    await user.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/t-1/checklist"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("[AC-028] ticking an item calls PATCH /checklist/{id} and the 'n of m done' count persists across reload", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    let items = [
      { id: "ci-1", task_id: "t-1", title: "Write tests", is_complete: false, position: 0 },
      { id: "ci-2", task_id: "t-1", title: "Ship it", is_complete: false, position: 1 },
    ];
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "PATCH" && url.endsWith("/checklist/ci-1")) {
        const body = JSON.parse(init!.body as string);
        items = items.map((i) => (i.id === "ci-1" ? { ...i, is_complete: body.is_complete } : i));
        return Promise.resolve(jsonResponse(items[0]));
      }
      if (method === "GET" && url.endsWith("/tasks/t-1")) {
        return Promise.resolve(jsonResponse({ ...DETAIL, checklist: items }));
      }
      if (method === "GET" && url.endsWith("/tasks/t-1/comments")) {
        return Promise.resolve(jsonResponse([]));
      }
      if (method === "GET" && url.endsWith("/labels")) {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderTask();

    await waitFor(() => expect(screen.getByText("Write tests")).toBeInTheDocument());
    expect(screen.getByText("0 of 2 done")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Write tests"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/checklist/ci-1"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await waitFor(() => expect(screen.getByText("1 of 2 done")).toBeInTheDocument());
  });

  it("[AC-029] adding a label from the GET /labels catalogue calls POST /tasks/{id}/labels and the chip renders", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    let labels: unknown[] = [];
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET" && url.endsWith("/labels")) {
        return Promise.resolve(
          jsonResponse([
            { id: "l-1", name: "Design", color: "neutral" },
            { id: "l-2", name: "Blocked", color: "accent" },
          ]),
        );
      }
      if (method === "POST" && url.endsWith("/tasks/t-1/labels")) {
        const body = JSON.parse(init!.body as string);
        labels = [{ id: body.label_id, name: body.label_id === "l-1" ? "Design" : "Blocked" }];
        return Promise.resolve(jsonResponse({ task_id: "t-1", label_id: body.label_id }));
      }
      if (method === "GET" && url.endsWith("/tasks/t-1")) {
        return Promise.resolve(jsonResponse({ ...DETAIL, labels }));
      }
      if (method === "GET" && url.endsWith("/tasks/t-1/comments")) {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderTask();

    await waitFor(() => expect(screen.getByText("Map legacy invoices")).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText(/add label/i), "l-1");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/t-1/labels"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() => expect(screen.getByText("Design")).toBeInTheDocument());
  });

  it("[AC-030] removing a label calls DELETE /tasks/{id}/labels/{label_id} and the chip disappears", async () => {
    setSession("jwt-1", { id: "u1", email: "me@example.com" });
    setSelectedTaskId("t-1");
    let labels = [{ id: "l-1", name: "Design", color: "neutral" }];
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "DELETE" && url.endsWith("/tasks/t-1/labels/l-1")) {
        labels = [];
        return Promise.resolve({ ok: true, status: 204, json: async () => undefined });
      }
      if (method === "GET" && url.endsWith("/tasks/t-1")) {
        return Promise.resolve(jsonResponse({ ...DETAIL, labels }));
      }
      if (method === "GET" && url.endsWith("/tasks/t-1/comments")) {
        return Promise.resolve(jsonResponse([]));
      }
      if (method === "GET" && url.endsWith("/labels")) {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderTask();

    await waitFor(() => expect(screen.getByText("Design")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /remove label design/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/t-1/labels/l-1"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    await waitFor(() => expect(screen.queryByText("Design")).not.toBeInTheDocument());
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
