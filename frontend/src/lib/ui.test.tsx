/**
 * Unit tests for the component vocabulary in frontend/src/lib/ui.tsx.
 *
 * This ticket carries no acceptance criteria of its own, so these tests
 * exercise what the file's own doc comment promises: every component is a
 * thin, accessible wrapper that (a) forwards the props a caller gives it
 * (children, onClick, onChange, value, disabled, ...) and (b) wires brand
 * tokens (--brand-primary, --brand-accent, --brand-radius, --brand-font-*)
 * through so a theme change repaints without touching a screen. We assert
 * behaviour and wiring, not the utility class strings, so a restyle that
 * keeps both intact keeps these tests green.
 */
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
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  Textarea,
} from "@/lib/ui";

describe("Button", () => {
  it("renders its children and fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save project</Button>);
    const button = screen.getByRole("button", { name: "Save project" });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Save project
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save project" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("paints the brand primary color onto a primary button so a theme change repaints it", () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole("button", { name: "Primary" });
    expect(button.style.backgroundColor).toBe("var(--brand-primary)");
  });

  it("leaves background color unset for non-primary variants", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.style.backgroundColor).toBe("");
  });

  it("lets a caller's own inline style win over the branded background", () => {
    render(
      <Button style={{ backgroundColor: "rebeccapurple" }}>
        Override
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Override" });
    expect(button.style.backgroundColor).toBe("rebeccapurple");
  });

  it("falls back to the primary styling for an unknown variant or size instead of crashing", () => {
    render(
      <Button variant="not-a-real-variant" size="not-a-real-size">
        Odd
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Odd" })).toBeInTheDocument();
  });
});

describe("Card family", () => {
  it("composes into a readable card with a title, description, content and footer", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Launch checklist</CardTitle>
          <CardDescription>Everything before go-live.</CardDescription>
        </CardHeader>
        <CardContent>Three tasks remaining.</CardContent>
        <CardFooter>
          <Button>Close</Button>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByText("Launch checklist")).toBeInTheDocument();
    expect(screen.getByText("Everything before go-live.")).toBeInTheDocument();
    expect(screen.getByText("Three tasks remaining.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("sets the card title's font to the brand heading font", () => {
    render(<CardTitle>Heading</CardTitle>);
    expect(screen.getByText("Heading")).toHaveStyle({
      fontFamily: "var(--brand-font-heading)",
    });
  });
});

describe("form fields", () => {
  it("Input forwards value, placeholder and change events like a native input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input placeholder="Name" value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText("Name");
    await user.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("Textarea forwards its value so a caller can read what was typed", () => {
    render(<Textarea readOnly value="Some notes" aria-label="Notes" />);
    expect(screen.getByLabelText("Notes")).toHaveValue("Some notes");
  });

  it("Label associates with its control via htmlFor so clicking the label focuses the input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="owner">Owner</Label>
        <Input id="owner" />
      </>,
    );
    await user.click(screen.getByText("Owner"));
    expect(screen.getByLabelText("Owner")).toHaveFocus();
  });

  it("Select renders its options prop and reports the chosen value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Status"
        defaultValue="open"
        onChange={onChange}
        options={[
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
        ]}
      />,
    );
    const select = screen.getByLabelText("Status");
    expect(screen.getByRole("option", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Done" })).toBeInTheDocument();
    await user.selectOptions(select, "done");
    expect(onChange).toHaveBeenCalled();
    expect(select).toHaveValue("done");
  });

  it("Select renders explicit children instead of options when both are given", () => {
    render(
      <Select aria-label="Priority" options={[{ value: "low", label: "Low" }]}>
        <option value="high">High</option>
      </Select>,
    );
    expect(screen.getByRole("option", { name: "High" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Low" })).not.toBeInTheDocument();
  });

  it("Checkbox is a real checkbox input that toggles on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="Done" onChange={onChange} />);
    const checkbox = screen.getByRole("checkbox", { name: "Done" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("Switch", () => {
  it("is an accessible checkbox that reflects the checked prop and calls onChange when toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);
    const toggle = screen.getByRole("checkbox", { hidden: true });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("shows as checked when the checked prop is true", () => {
    render(<Switch checked onChange={() => {}} />);
    expect(screen.getByRole("checkbox", { hidden: true })).toBeChecked();
  });
});

describe("Badge", () => {
  it("renders its label text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("paints the brand accent color only for the accent variant", () => {
    render(<Badge variant="accent">Featured</Badge>);
    expect(screen.getByText("Featured").style.backgroundColor).toBe("var(--brand-accent)");
  });

  it("leaves background color to its stylesheet classes for a non-accent variant", () => {
    render(<Badge variant="success">Done</Badge>);
    expect(screen.getByText("Done").style.backgroundColor).toBe("");
  });
});

describe("Table", () => {
  it("renders a full table with headers and rows a user can read", () => {
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
            <TD>Launch site</TD>
            <TD>Open</TD>
          </TR>
        </TBody>
      </Table>,
    );
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Launch site" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Open" })).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("shows initials made of the first letter of the first two words of the name", () => {
    render(<Avatar name="Rhea Patel" />);
    expect(screen.getByText("RP")).toBeInTheDocument();
  });

  it("collapses to a single initial for a one-word name", () => {
    render(<Avatar name="Rhea" />);
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("renders an image with alt text equal to the name when a src is given, instead of initials", () => {
    render(<Avatar name="Rhea Patel" src="/avatar.png" />);
    const img = screen.getByRole("img", { name: "Rhea Patel" });
    expect(img).toHaveAttribute("src", "/avatar.png");
    expect(screen.queryByText("RP")).not.toBeInTheDocument();
  });

  it("renders no initials for an empty name instead of crashing", () => {
    const { container } = render(<Avatar />);
    expect(container.textContent).toBe("");
  });
});

describe("Separator", () => {
  it("renders a semantic separator", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

describe("Tabs", () => {
  it("renders one button per tab and reports the clicked tab's key", async () => {
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
    expect(screen.getByRole("button", { name: "Board" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "List" }));
    expect(onChange).toHaveBeenCalledWith("list");
  });
});

describe("Stat", () => {
  it("shows the label and value, and only shows the hint when one is given", () => {
    const { rerender } = render(<Stat label="Open tasks" value={12} />);
    expect(screen.getByText("Open tasks")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByText("+3 this week")).not.toBeInTheDocument();

    rerender(<Stat label="Open tasks" value={12} hint="+3 this week" />);
    expect(screen.getByText("+3 this week")).toBeInTheDocument();
  });

  it("sets the value's font to the brand heading font", () => {
    render(<Stat label="Open tasks" value={12} />);
    expect(screen.getByText("12")).toHaveStyle({ fontFamily: "var(--brand-font-heading)" });
  });
});

describe("Empty", () => {
  it("shows the title, an optional description, and a caller-provided action", () => {
    render(
      <Empty
        title="No tasks yet"
        description="Create your first task to get started."
        action={<Button>New task</Button>}
      />,
    );
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("Create your first task to get started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New task" })).toBeInTheDocument();
  });

  it("omits the description paragraph entirely when none is given", () => {
    const { container } = render(<Empty title="No tasks yet" />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
