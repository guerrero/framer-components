import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getPropertyControls, setStaticRenderer } from "@/mock";

import FadeIn from "./FadeIn";

afterEach(() => {
  setStaticRenderer(false);
});

describe("FadeIn", () => {
  it("renders children coming from the Slot control", () => {
    render(
      <FadeIn>
        <span>Revealed content</span>
      </FadeIn>,
    );

    expect(screen.getByText("Revealed content")).toBeInTheDocument();
  });

  it("renders fully visible in a static renderer", () => {
    setStaticRenderer(true);

    render(
      <FadeIn>
        <span>Static content</span>
      </FadeIn>,
    );

    expect(screen.getByText("Static content")).toBeInTheDocument();
  });

  it("registers a Slot control for its children", () => {
    const controls = getPropertyControls(FadeIn);

    expect(controls?.children).toMatchObject({ type: "slot" });
  });
});
