import { fireEvent, render, screen } from "@testing-library/react";
import {
  createElement,
  forwardRef,
  type ComponentType,
  type CSSProperties,
  type RefAttributes,
} from "react";
import { describe, expect, it } from "vitest";

import { withHoverLift } from "./withHoverLift";

interface LayerProps {
  style?: CSSProperties;
}

const Layer = forwardRef<HTMLDivElement, LayerProps>(function Layer(props, ref) {
  return <div ref={ref} data-testid="layer" {...props} />;
});

const LiftedLayer: ComponentType<LayerProps & RefAttributes<HTMLDivElement>> = withHoverLift(Layer);

describe("withHoverLift", () => {
  it("lifts the layer while hovered", () => {
    render(<LiftedLayer />);
    const layer = screen.getByTestId("layer");

    fireEvent.mouseEnter(layer);
    expect(layer).toHaveStyle({ transform: "translateY(-6px)" });

    fireEvent.mouseLeave(layer);
    expect(layer).not.toHaveStyle({ transform: "translateY(-6px)" });
  });

  it("forwards refs to the wrapped layer", () => {
    const ref: { current: HTMLDivElement | null } = { current: null };

    render(createElement(LiftedLayer, { ref }));

    expect(ref.current).toBe(screen.getByTestId("layer"));
  });
});
