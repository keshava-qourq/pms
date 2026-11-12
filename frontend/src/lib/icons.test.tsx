import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ICON_NAMES, Icons } from "@/lib/icons";

describe("Icons", () => {
  it("has a component for every name listed in ICON_NAMES, and no extra ones", () => {
    expect(ICON_NAMES.length).toBeGreaterThan(0);
    expect(Object.keys(Icons).sort()).toEqual([...ICON_NAMES].sort());
  });

  it("lists each name only once", () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it.each(ICON_NAMES)("renders %s as a hidden decorative svg", (name) => {
    const Icon = Icons[name];
    const { container } = render(<Icon />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    // Every icon must actually draw something: an empty <svg> would be the
    // "blank square" this module exists to avoid.
    expect(svg?.children.length).toBeGreaterThan(0);
  });

  it("defaults to a 16x16 box", () => {
    const Icon = Icons.Plus;
    const { container } = render(<Icon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("honours a custom size prop", () => {
    const Icon = Icons.Plus;
    const { container } = render(<Icon size={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("height", "32");
  });

  it("forwards other svg props, such as className, onto the <svg>", () => {
    const Icon = Icons.Plus;
    const { container } = render(<Icon className="text-red-500" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-red-500");
  });

  it("draws different icons with different markup, rather than reusing one path for every name", () => {
    const render1 = render(<Icons.Plus />).container.querySelector("svg")?.innerHTML;
    const render2 = render(<Icons.X />).container.querySelector("svg")?.innerHTML;
    expect(render1).not.toBe(render2);
  });

  it("includes the icon names the Builder prompt is known to rely on", () => {
    for (const name of ["Plus", "Search", "Check", "X", "Trash", "Edit", "Users", "Settings"]) {
      expect(ICON_NAMES).toContain(name);
      expect(Icons[name]).toBeDefined();
    }
  });
});
