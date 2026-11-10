import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Empty,
  Input,
  Label,
  Select,
  Separator,
  Stat,
  Switch,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  Tabs,
  Textarea,
} from "@/lib/ui";

describe("Button", () => {
  it("renders its children as a real button a user can click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button and stops it from receiving clicks when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("paints the primary variant from the brand custom property instead of a hardcoded color", () => {
    render(<Button variant="primary">Go</Button>);
    const button = screen.getByRole("button", { name: "Go" });
    expect(button.style.backgroundColor).toBe("var(--brand-primary)");
  });

  it("does not apply the brand background to non-primary variants", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.style.backgroundColor).toBe("");
  });

  it("falls back to the primary look for an unknown variant rather than rendering unstyled", () => {
    render(<Button variant="not-a-real-variant">Weird</Button>);
    const button = screen.getByRole("button", { name: "Weird" });
    expect(button.style.backgroundColor).toBe("var(--brand-primary)");
  });

  it("lets a caller's className and inline style win over the built-in ones", () => {
    render(
      <Button className="my-extra-class" style={{ backgroundColor: "red" }}>
        Styled
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Styled" });
    expect(button).toHaveClass("my-extra-class");
    expect(button.style.backgroundColor).toBe("red");
  });
});

describe("Card", () => {
  it("assembles a card from its parts with the title and description a user reads", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Project Alpha</CardTitle>
          <CardDescription>A short summary</CardDescription>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("A short summary")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("renders the title as a heading so the card's subject is announced to assistive tech", () => {
    render(<CardTitle>Heading text</CardTitle>);
    expect(screen.getByRole("heading", { name: "Heading text" })).toBeInTheDocument();
  });
});

describe("form fields", () => {
  it("lets a user type into an Input and read back the value", async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Name" />);
    const input = screen.getByPlaceholderText("Name");
    await user.type(input, "Ada Lovelace");
    expect(input).toHaveValue("Ada Lovelace");
  });

  it("lets a user type multi-line text into a Textarea", async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder="Notes" />);
    const textarea = screen.getByPlaceholderText("Notes");
    await user.type(textarea, "line one");
    expect(textarea).toHaveValue("line one");
  });

  it("associates a Label with its field by htmlFor so clicking the label focuses the input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" />
      </>,
    );
    await user.click(screen.getByText("Email"));
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("renders Select options from the options prop and lets a user choose one", async () => {
    const user = userEvent.setup();
    render(
      <Select
        aria-label="Status"
        options={[
          { value: "todo", label: "To do" },
          { value: "done", label: "Done" },
        ]}
      />,
    );
    const select = screen.getByLabelText("Status") as HTMLSelectElement;
    expect(screen.getByRole("option", { name: "To do" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Done" })).toBeInTheDocument();
    await user.selectOptions(select, "done");
    expect(select).toHaveValue("done");
  });

  it("prefers explicit children over the options prop when a caller supplies both", () => {
    render(
      <Select aria-label="Status" options={[{ value: "todo", label: "To do" }]}>
        <option value="custom">Custom</option>
      </Select>,
    );
    expect(screen.getByRole("option", { name: "Custom" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "To do" })).not.toBeInTheDocument();
  });

  it("toggles a Checkbox when the user clicks it", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Agree" />);
    const checkbox = screen.getByLabelText("Agree") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});

describe("Switch", () => {
  it("reflects the checked prop and reports toggles through onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Switch checked={false} onChange={onChange} />);
    const input = screen.getByRole("checkbox", { hidden: true }) as HTMLInputElement;
    expect(input.checked).toBe(false);

    await user.click(input);
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(<Switch checked={true} onChange={onChange} />);
    expect((screen.getByRole("checkbox", { hidden: true }) as HTMLInputElement).checked).toBe(
      true,
    );
  });
});

describe("Badge", () => {
  it("paints the accent variant from the brand accent custom property", () => {
    render(<Badge variant="accent">New</Badge>);
    const badge = screen.getByText("New");
    expect(badge.style.backgroundColor).toBe("var(--brand-accent)");
  });

  it("does not apply the brand accent background to the default variant", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.style.backgroundColor).toBe("");
  });
});

describe("Table", () => {
  it("renders a real table with head, body rows and cells a user can read", () => {
    render(
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>Alpha</TD>
            <TD>Done</TD>
          </TR>
        </TBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Done" })).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("shows the initials of up to two name parts when there is no image", () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("ignores extra words in the name beyond the first two", () => {
    render(<Avatar name="Ada Byron Lovelace" />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("renders the image with the name as its alt text when a src is given", () => {
    render(<Avatar name="Ada Lovelace" src="https://example.com/ada.png" />);
    const img = screen.getByRole("img", { name: "Ada Lovelace" }) as HTMLImageElement;
    expect(img.src).toBe("https://example.com/ada.png");
    expect(screen.queryByText("AL")).not.toBeInTheDocument();
  });
});

describe("Separator", () => {
  it("renders a horizontal rule that separates content", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

describe("Tabs", () => {
  it("lets a user switch tabs and reports the chosen key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        tabs={[
          { key: "board", label: "Board" },
          { key: "list", label: "List" },
        ]}
        active="board"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "List" }));
    expect(onChange).toHaveBeenCalledWith("list");
  });

  it("renders every tab passed in, even before any is active", () => {
    render(
      <Tabs
        tabs={[
          { key: "a", label: "A" },
          { key: "b", label: "B" },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
  });
});

describe("Stat", () => {
  it("shows the label, value and optional hint a user reads on a dashboard", () => {
    render(<Stat label="Open tasks" value={42} hint="as of today" />);
    expect(screen.getByText("Open tasks")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("as of today")).toBeInTheDocument();
  });

  it("omits the hint paragraph entirely when none is given", () => {
    render(<Stat label="Open tasks" value={42} />);
    expect(screen.queryByText("as of today")).not.toBeInTheDocument();
  });
});

describe("Empty", () => {
  it("shows the title, optional description and an action a user can take", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Empty
        title="No tasks yet"
        description="Create your first task to get started."
        action={<button onClick={onClick}>New task</button>}
      />,
    );
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first task to get started."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New task" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("omits the description entirely when none is given", () => {
    render(<Empty title="No tasks yet" />);
    expect(screen.queryByText(/create your first/i)).not.toBeInTheDocument();
  });
});
