import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignIn } from "./SignIn";

const mockPost = vi.fn();

vi.mock("../api/client", () => ({
  client: {
    POST: (...args: unknown[]) => mockPost(...args),
  },
}));

describe("SignIn", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("[AC-042] does not display the removed descriptive paragraph", () => {
    render(<SignIn />);

    expect(
      screen.queryByText(
        "Email and password. Every signed-in member sees and edits every project in the workspace."
      )
    ).not.toBeInTheDocument();
  });

  it("[AC-043] renders the email field, password field and submit button with no visual regression", () => {
    render(<SignIn />);

    expect(screen.getByTestId("signin-email")).toBeInTheDocument();
    expect(screen.getByTestId("signin-password")).toBeInTheDocument();
    expect(screen.getByTestId("signin-submit")).toBeInTheDocument();
    expect(screen.queryByTestId("signin-error")).not.toBeInTheDocument();
  });

  it("[AC-044] shows an error message when sign-in fails", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { message: "invalid credentials" },
    });
    render(<SignIn />);

    fireEvent.change(screen.getByTestId("signin-email"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByTestId("signin-password"), {
      target: { value: crypto.randomUUID() },
    });
    fireEvent.click(screen.getByTestId("signin-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("signin-error")).toHaveTextContent(
        "Invalid email or password."
      )
    );
  });

  it("[AC-044] signs the user in and reports the token on success", async () => {
    mockPost.mockResolvedValue({
      data: { token: "tok-123" },
      error: undefined,
    });
    const onSignedIn = vi.fn();
    render(<SignIn onSignedIn={onSignedIn} />);

    fireEvent.change(screen.getByTestId("signin-email"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByTestId("signin-password"), {
      target: { value: crypto.randomUUID() },
    });
    fireEvent.click(screen.getByTestId("signin-submit"));

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith("tok-123"));
    expect(screen.queryByTestId("signin-error")).not.toBeInTheDocument();
  });
});
