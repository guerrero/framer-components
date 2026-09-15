import { render, screen } from "@testing-library/react";
import { forwardRef, type CSSProperties } from "react";
import { describe, expect, it } from "vitest";

import { withPointer } from "./withPointer";

const Layer = forwardRef<HTMLDivElement, { style?: CSSProperties }>(function Layer(props, ref) {
  return <div ref={ref} data-testid="layer" {...props} />;
});

const PointerLayer = withPointer(Layer);

describe("withPointer", () => {
  it("adds a pointer cursor to the wrapped layer", () => {
    render(<PointerLayer />);

    expect(screen.getByTestId("layer")).toHaveStyle({ cursor: "pointer" });
  });
});
