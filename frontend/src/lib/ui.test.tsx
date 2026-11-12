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
  Table,
  Textarea,
  TR,
} from "@/lib/ui";

describe("Button", () => {
  it("renders its children and responds to clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("sets the brand primary background color for the default primary variant", () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole("button", { name: "Primary" });
    expect(button.style.backgroundColor).toBe("var(--brand-primary)");
  });

  it("does not set the brand background color for non-primary variants", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button", { name: "Secondary" });
    expect(button.style.backgroundColor).toBe("");
  });

  it("falls back to the primary styling for an unknown variant", () => {
    render(<Button variant="not-a-real-variant">Mystery</Button>);
    const button = screen.getByRole("button", { name: "Mystery" });
    expect(button.style.backgroundColor).toBe("var(--brand-primary)");
  });

  it("merges a caller-provided className rather than replacing the built-in classes", () => {
    render(<Button className="my-extra-class">Styled</Button>);
    const button = screen.getByRole("button", { name: "Styled" });
    expect(button).toHaveClass("my-extra-class");
    expect(button.className).toContain("rounded-[var(--brand-radius)]");
  });

  it("merges a caller-provided style rather than overwriting the branded background", () => {
    render(<Button style={{ marginTop: "4px" }}>With style</Button>);
    const button = screen.getByRole("button", { name: "With style" });
    expect(button.style.marginTop).toBe("4px");
    expect(button.style.backgroundColor).toBe("var(--brand-primary)");
  });

  it("disables the button and prevents clicks when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Card family", () => {
  it("composes header, title, description, content and footer around the card children", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title text</CardTitle>
          <CardDescription>Description text</CardDescription>
        </CardHeader>
        <CardContent>Body text</CardContent>
        <CardFooter>Footer text</CardFooter>
      </Card>
    );
    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Title text" })).toBeInTheDocument();
    expect(screen.getByText("Description text")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
    expect(screen.getByText("Footer text")).toBeInTheDocument();
  });

  it("uses the brand heading font on CardTitle", () => {
    render(<CardTitle>Headline</CardTitle>);
    const title = screen.getByRole("heading", { name: "Headline" });
    expect(title.style.fontFamily).toBe("var(--brand-font-heading)");
  });
});

describe("form fields", () => {
  it("renders a labelled text input and accepts typed text", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Jane" />
      </>
    );
    const input = screen.getByPlaceholderText("Jane");
    await user.type(input, "Ada");
    expect(input).toHaveValue("Ada");
  });

  it("renders a textarea that accepts typed text", async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder="Notes" />);
    const textarea = screen.getByPlaceholderText("Notes");
    await user.type(textarea, "hello");
    expect(textarea).toHaveValue("hello");
  });

  it("renders Select options from the options prop", () => {
    render(
      <Select
        aria-label="Choose"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    );
    const select = screen.getByRole("combobox", { name: "Choose" }) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((option) => option.textContent);
    expect(optionLabels).toEqual(["Alpha", "Beta"]);
  });

  it("renders explicit children on Select instead of the options prop when both are given", () => {
    render(
      <Select aria-label="Choose" options={[{ value: "a", label: "Alpha" }]}>
        <option value="c">Gamma</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Choose" }) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((option) => option.textContent);
    expect(optionLabels).toEqual(["Gamma"]);
  });

  it("toggles a Checkbox on click", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Agree" />);
    const checkbox = screen.getByRole("checkbox", { name: "Agree" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});

describe("Switch", () => {
  it("reflects the checked prop and calls onChange when toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Switch checked={false} onChange={onChange} />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(false);
    await user.click(input);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("Badge", () => {
  it("applies the brand accent background color only for the accent variant", () => {
    render(
      <>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="success">Success</Badge>
      </>
    );
    const accent = screen.getByText("Accent");
    const success = screen.getByText("Success");
    expect(accent.style.backgroundColor).toBe("var(--brand-accent)");
    expect(success.style.backgroundColor).toBe("");
  });

  it("falls back to the default variant styling for an unknown variant", () => {
    render(<Badge variant="not-a-real-variant">Odd</Badge>);
    const badge = screen.getByText("Odd");
    expect(badge.className).toContain("bg-slate-100");
  });
});

describe("Table family", () => {
  it("renders a full table with header and body rows", () => {
    render(
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>Ada</TD>
          </TR>
        </TBody>
      </Table>
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Ada" })).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("shows initials from the name when no image is given", () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders an image with the name as alt text when a src is given, instead of initials", () => {
    render(<Avatar name="Ada Lovelace" src="https://example.com/ada.png" />);
    const img = screen.getByRole("img", { name: "Ada Lovelace" });
    expect(img).toHaveAttribute("src", "https://example.com/ada.png");
    expect(screen.queryByText("AL")).not.toBeInTheDocument();
  });

  it("renders no initials for an empty name", () => {
    const { container } = render(<Avatar />);
    expect(container.textContent).toBe("");
  });
});

describe("Separator", () => {
  it("renders a horizontal rule", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

describe("Tabs", () => {
  it("renders a button per tab, marks the active one, and calls onChange with the clicked key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        tabs={[
          { key: "one", label: "One" },
          { key: "two", label: "Two" },
        ]}
        active="one"
        onChange={onChange}
      />
    );
    const one = screen.getByRole("button", { name: "One" });
    const two = screen.getByRole("button", { name: "Two" });
    expect(one.className).toContain("text-slate-900");
    expect(two.className).not.toContain("text-slate-900");
    await user.click(two);
    expect(onChange).toHaveBeenCalledWith("two");
  });
});

describe("Stat", () => {
  it("shows the label, value and optional hint", () => {
    render(<Stat label="Open tasks" value={42} hint="This week" />);
    expect(screen.getByText("Open tasks")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("This week")).toBeInTheDocument();
  });

  it("omits the hint paragraph when no hint is given", () => {
    render(<Stat label="Open tasks" value={42} />);
    expect(screen.queryByText("This week")).not.toBeInTheDocument();
  });
});

describe("Empty", () => {
  it("shows the title, optional description, and an action node", () => {
    render(
      <Empty
        title="No tasks yet"
        description="Create your first one"
        action={<button>Create task</button>}
      />
    );
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("Create your first one")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create task" })).toBeInTheDocument();
  });

  it("omits the description paragraph and action when neither is given", () => {
    render(<Empty title="No tasks yet" />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
