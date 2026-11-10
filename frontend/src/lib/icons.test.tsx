import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Icons, ICON_NAMES } from "@/lib/icons";

describe("Icons", () => {
  it("exposes exactly one component per declared icon name, with no gaps", () => {
    expect(ICON_NAMES.length).toBeGreaterThan(0);
    expect(Object.keys(Icons).sort()).toEqual([...ICON_NAMES].sort());
    for (const name of ICON_NAMES) {
      expect(typeof Icons[name]).toBe("function");
    }
  });

  it("an undeclared name is simply absent from the set, not a blank fallback icon", () => {
    expect(Icons["NotARealIcon"]).toBeUndefined();
  });

  it("renders every declared icon as an svg with the shared 24x24 viewBox and at least one shape", () => {
    for (const name of ICON_NAMES) {
      const Icon = Icons[name];
      const { container, unmount } = render(<Icon data-testid={`icon-${name}`} />);
      const svg = container.querySelector("svg");
      expect(svg, `${name} should render an <svg>`).not.toBeNull();
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
      expect(svg!.children.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("hides every icon from assistive tech, since none carries its own accessible label", () => {
    const { container } = render(<Icons.Check />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("defaults to a 16px square and scales with an explicit size prop", () => {
    const { container: defaultContainer } = render(<Icons.Plus />);
    const defaultSvg = defaultContainer.querySelector("svg")!;
    expect(defaultSvg).toHaveAttribute("width", "16");
    expect(defaultSvg).toHaveAttribute("height", "16");

    const { container: bigContainer } = render(<Icons.Plus size={32} />);
    const bigSvg = bigContainer.querySelector("svg")!;
    expect(bigSvg).toHaveAttribute("width", "32");
    expect(bigSvg).toHaveAttribute("height", "32");
  });

  it("passes through arbitrary svg props, like className and event handlers, to the underlying svg", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    const { container } = render(
      <Icons.Trash className="text-red-500" onClick={() => (clicks += 1)} />,
    );
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveClass("text-red-500");

    await user.click(svg);
    expect(clicks).toBe(1);
  });

  it("gives different icon names visibly different markup, so swapping a name is not a silent no-op", () => {
    const { container: plusContainer } = render(<Icons.Plus />);
    const { container: checkContainer } = render(<Icons.Check />);
    expect(plusContainer.innerHTML).not.toBe(checkContainer.innerHTML);
  });

  it("renders the icons every current screen destructures off the set", () => {
    // App.tsx, Project.tsx, Projects.tsx, Team.tsx, Task.tsx, AcceptInvite.tsx
    // and SignIn.tsx all write `const { Plus, Check, ... } = Icons`. Since
    // `Icons` is typed as `Record<string, FC>`, a rename here would not fail
    // typecheck -- the destructured name would just resolve to `undefined`
    // and render nothing. This pins the set those screens depend on.
    const used = [
      "Home",
      "User",
      "Check",
      "ArrowRight",
      "AlertCircle",
      "CheckCircle",
      "Plus",
      "Search",
      "X",
      "ChevronRight",
      "ChevronLeft",
      "Clock",
      "ArrowLeft",
      "ChevronDown",
    ];
    for (const name of used) {
      expect(ICON_NAMES).toContain(name);
      expect(Icons[name]).toBeDefined();
    }
  });
});
