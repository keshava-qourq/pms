import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icons, ICON_NAMES } from "@/lib/icons";

describe("Icons", () => {
  it("exposes a renderable component for every name in ICON_NAMES", () => {
    expect(ICON_NAMES.length).toBeGreaterThan(0);
    for (const name of ICON_NAMES) {
      const Icon = Icons[name];
      expect(typeof Icon).toBe("function");
      const { container, unmount } = render(<Icon data-testid={`icon-${name}`} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      // Every icon must actually draw something -- a name with an empty <svg>
      // renders as a blank square, which is exactly the failure mode the
      // module's own comment says this finite set exists to avoid.
      expect(svg?.children.length ?? 0).toBeGreaterThan(0);
      unmount();
    }
  });

  it("defaults to a 16x16 box and lets a caller override the size", () => {
    const Icon = Icons.Plus;
    const { container: defaultContainer, unmount: unmountDefault } = render(<Icon />);
    const defaultSvg = defaultContainer.querySelector("svg");
    expect(defaultSvg).toHaveAttribute("width", "16");
    expect(defaultSvg).toHaveAttribute("height", "16");
    unmountDefault();

    const { container: sizedContainer, unmount: unmountSized } = render(<Icon size={32} />);
    const sizedSvg = sizedContainer.querySelector("svg");
    expect(sizedSvg).toHaveAttribute("width", "32");
    expect(sizedSvg).toHaveAttribute("height", "32");
    unmountSized();
  });

  it("is hidden from the accessibility tree since it carries no text alternative", () => {
    const { container, unmount } = render(<Icons.Search />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    unmount();
  });

  it("passes through extra props such as className to the svg element", () => {
    const { container, unmount } = render(<Icons.Check className="text-brand" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-brand");
    unmount();
  });

  it("keeps ICON_NAMES in sync with the keys of Icons", () => {
    expect(Object.keys(Icons).sort()).toEqual([...ICON_NAMES].sort());
  });

  it("includes the icon names the generated screens currently import", () => {
    // App.tsx, Projects.tsx, Team.tsx, Task.tsx, AcceptInvite.tsx, Project.tsx and
    // SignIn.tsx all import from this module; losing one of these names is a
    // compile error for a screen rather than a blank icon, by design.
    for (const name of ["Home", "User", "Plus", "Search", "Check", "X", "Users", "Settings"]) {
      expect(Icons).toHaveProperty(name);
    }
  });
});
