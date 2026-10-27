import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import App from "./App";
import { clearSession, setSession } from "@/lib/api";

describe("App", () => {
  afterEach(() => {
    clearSession();
  });

  it("renders a screen inside the app shell and shows its menu when signed in", () => {
    setSession("test-token", { id: "1", email: "rhea@example.com" });
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <App />
      </MemoryRouter>,
    );
    // getAllByText, not getByText: the page may repeat its menu item's text.
    expect(screen.getAllByText("Projects").length).toBeGreaterThan(0);
  });

  it("[AC-003][NFR-001] redirects an unauthenticated visit to /projects to /sign-in", () => {
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Sign in to PMS")).toBeInTheDocument();
  });

  it("[AC-003][NFR-001] redirects an unauthenticated visit to /project, /task, /team to /sign-in", () => {
    for (const entry of ["/project", "/task", "/team"]) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[entry]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByText("Sign in to PMS")).toBeInTheDocument();
      unmount();
    }
  });
});
