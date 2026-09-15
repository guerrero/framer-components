import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getPropertyControls } from "@/mock";

import SlideshowCMS from "./SlideshowCMS";

describe("SlideshowCMS", () => {
  it("asks for a collection when no children are connected", () => {
    render(<SlideshowCMS />);

    expect(screen.getByText(/Connect a Collection List/)).toBeInTheDocument();
  });

  it("renders connected slides with arrows and dots", () => {
    render(
      <SlideshowCMS>
        <div>Slide one</div>
        <div>Slide two</div>
      </SlideshowCMS>,
    );

    expect(screen.getAllByText(/Slide (one|two)/)).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to slide 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to slide 2" })).toBeInTheDocument();
  });

  it("advances to the next slide", () => {
    render(
      <SlideshowCMS>
        <div>Slide one</div>
        <div>Slide two</div>
      </SlideshowCMS>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));

    expect(screen.getByRole("button", { name: "Go to slide 2" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("registers property controls for the Framer panel", () => {
    const controls = getPropertyControls(SlideshowCMS);

    expect(Object.keys(controls ?? {})).toEqual(
      expect.arrayContaining([
        "children",
        "itemsPerView",
        "gap",
        "autoplay",
        "draggable",
        "loop",
        "arrows",
        "dots",
        "clipping",
      ]),
    );
  });
});
