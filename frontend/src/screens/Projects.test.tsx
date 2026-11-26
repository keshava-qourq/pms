import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Projects from "@/screens/Projects";
import { clearSession, setSession } from "@/lib/api";
import { getSelectedProjectId } from "@/lib/selectedProject";
import { queryClient } from "@/lib/queryClient";

function renderProjects() {
  return render(
    <MemoryRouter initialEntries={["/projects"]}>
      <Routes>
        <Route path="/projects" element={<Projects />} />
        <Route path="/project" element={<div>Project workspace</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

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

/** Walks every rendered element and asserts its computed color, background and
 * border colours are achromatic -- black, white or grey, never a hue. */
function assertAchromatic(container: HTMLElement) {
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

describe("Projects screen", () => {
  afterEach(() => {
    clearSession();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    queryClient.clear();
  });

  it("[AC-007] shows a loading state, then every project from GET /projects for any signed-in member; no seeded sample data", async () => {
    setSession("jwt-1", { id: "u1", email: "rhea@example.com" });
    const list = [
      {
        project: {
          id: "p-1",
          name: "Billing Migration",
          description: "Cut invoicing over.",
          created_by: "u-other",
          created_at: "2026-10-01T00:00:00Z",
        },
        task_total: 4,
        task_complete: 2,
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(list));
    vi.stubGlobal("fetch", fetchMock);

    renderProjects();

    expect(screen.getByText(/loading the workspace/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Billing Migration")).toBeInTheDocument());
    expect(fetchMock.mock.calls[0][0]).toContain("/projects");

    // seeded sample arrays removed
    expect(screen.queryByText("Website Redesign")).not.toBeInTheDocument();
    expect(screen.queryByText("Mobile App v2")).not.toBeInTheDocument();
    expect(screen.queryByText("Dana Whitfield")).not.toBeInTheDocument();
  });

  it("shows an empty state when GET /projects returns none", async () => {
    setSession("jwt-1", { id: "u1" });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    renderProjects();

    await waitFor(() => expect(screen.getByText("No projects yet")).toBeInTheDocument());
  });

  it("posts to POST /projects on create and refreshes the list from the server cache", async () => {
    setSession("jwt-1", { id: "u1" });
    const initial = [
      {
        project: {
          id: "p-1",
          name: "Billing Migration",
          description: "Cut invoicing over.",
          created_by: "u1",
          created_at: "2026-10-01T00:00:00Z",
        },
        task_total: 0,
        task_complete: 0,
      },
    ];
    const afterCreate = [
      ...initial,
      {
        project: {
          id: "p-2",
          name: "New Portal",
          description: "",
          created_by: "u1",
          created_at: "2026-10-26T00:00:00Z",
        },
        task_total: 0,
        task_complete: 0,
      },
    ];
    let getCalls = 0;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(jsonResponse(afterCreate[1].project));
      }
      getCalls += 1;
      return Promise.resolve(jsonResponse(getCalls === 1 ? initial : afterCreate));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderProjects();

    await waitFor(() => expect(screen.getByText("Billing Migration")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /new project/i }));
    await user.type(screen.getByLabelText(/^Name/i), "New Portal");
    await user.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/projects"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toEqual({
      name: "New Portal",
    });

    await waitFor(() => expect(screen.getAllByText("New Portal").length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: /New Portal/i })).toBeInTheDocument();
    expect(getCalls).toBeGreaterThanOrEqual(2);
  });

  it("does not hide or disable a project based on who created it, and records the selected project before navigating", async () => {
    setSession("jwt-1", { id: "u1" });
    const list = [
      {
        project: {
          id: "p-9",
          name: "Someone Else's Project",
          description: "",
          created_by: "u-other",
          created_at: "2026-09-01T00:00:00Z",
        },
        task_total: 1,
        task_complete: 0,
      },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(list)));

    const user = userEvent.setup();
    renderProjects();

    await waitFor(() => expect(screen.getByText("Someone Else's Project")).toBeInTheDocument());
    const openButton = within(screen.getByText("Someone Else's Project").closest("li")!).getByRole(
      "button",
      { name: /Someone Else's Project/i },
    );
    expect(openButton).toBeEnabled();
    await user.click(openButton);

    await waitFor(() => expect(getSelectedProjectId()).toBe("p-9"));
    await waitFor(() => expect(screen.getByText("Project workspace")).toBeInTheDocument());
  });

  it("[AC-033] project cards and progress indicators render only black, white and greyscale colors", async () => {
    setSession("jwt-1", { id: "u1" });
    const list = [
      {
        project: {
          id: "p-1",
          name: "Billing Migration",
          description: "Cut invoicing over.",
          created_by: "u1",
          created_at: "2026-10-01T00:00:00Z",
        },
        task_total: 4,
        task_complete: 2,
      },
      {
        project: {
          id: "p-2",
          name: "Finished Project",
          description: "",
          created_by: "u1",
          created_at: "2026-10-01T00:00:00Z",
        },
        task_total: 3,
        task_complete: 3,
      },
      {
        project: {
          id: "p-3",
          name: "Not Started Yet",
          description: "",
          created_by: "u1",
          created_at: "2026-10-01T00:00:00Z",
        },
        task_total: 2,
        task_complete: 0,
      },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(list)));

    const { container } = renderProjects();

    await waitFor(() => expect(screen.getByText("Billing Migration")).toBeInTheDocument());
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByText("Not started")).toBeInTheDocument();

    assertAchromatic(container);
  });

  it("[AC-033] the empty state renders only black, white and greyscale colors", async () => {
    setSession("jwt-1", { id: "u1" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    const { container } = renderProjects();

    await waitFor(() => expect(screen.getByText("No projects yet")).toBeInTheDocument());

    assertAchromatic(container);
  });
});
