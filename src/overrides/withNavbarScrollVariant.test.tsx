import { fireEvent, render, screen } from "@testing-library/react";
import { createElement, forwardRef, type ComponentType, type RefAttributes } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { withNavbarScrollVariant } from "./withNavbarScrollVariant";

interface NavbarProps {
  variant?: string;
  $control__variant?: string;
}

const Navbar = forwardRef<HTMLDivElement, NavbarProps>(function Navbar(props, ref) {
  return (
    <div ref={ref} data-testid="navbar" data-variant={props.variant ?? props.$control__variant} />
  );
});

const ScrollNavbar: ComponentType<NavbarProps & RefAttributes<HTMLDivElement>> =
  withNavbarScrollVariant(Navbar);

function setScrollY(value: number): void {
  Object.defineProperty(window, "scrollY", { value, configurable: true });
}

afterEach(() => {
  setScrollY(0);
});

describe("withNavbarScrollVariant", () => {
  it("keeps the configured variant at the top of the page", () => {
    render(createElement(ScrollNavbar, { variant: "Desktop" }));

    expect(screen.getByTestId("navbar")).toHaveAttribute("data-variant", "IelcRifD8");
  });

  it("switches to the Scrolled variant after scrolling down and back", () => {
    render(createElement(ScrollNavbar, { variant: "Desktop" }));
    const navbar = screen.getByTestId("navbar");

    setScrollY(120);
    fireEvent.scroll(window);
    expect(navbar).toHaveAttribute("data-variant", "KQ__xtisV");

    setScrollY(0);
    fireEvent.scroll(window);
    expect(navbar).toHaveAttribute("data-variant", "IelcRifD8");
  });

  it("resolves phone variants by their internal ids", () => {
    render(createElement(ScrollNavbar, { $control__variant: "gRk2pQ9PN" }));

    setScrollY(40);
    fireEvent.scroll(window);

    expect(screen.getByTestId("navbar")).toHaveAttribute("data-variant", "Tq7fe3nBv");
  });

  it("forwards refs to the wrapped layer", () => {
    const ref: { current: HTMLDivElement | null } = { current: null };

    render(createElement(ScrollNavbar, { ref, variant: "Desktop" }));

    expect(ref.current).toBe(screen.getByTestId("navbar"));
  });
});
