import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getPropertyControls, setStaticRenderer } from "@/mock";

import FeatureScroll from "./FeatureScroll";

const slides = [
  { title: "Paperwork", description: "Does it for you." },
  { title: "In the loop", description: "Always up to date." },
];

afterEach(() => {
  setStaticRenderer(false);
});

describe("FeatureScroll", () => {
  it("renders every slide title and description", () => {
    // Static rendering avoids video playback in jsdom.
    setStaticRenderer(true);

    render(<FeatureScroll slides={slides} />);

    expect(screen.getByText("Paperwork")).toBeInTheDocument();
    expect(screen.getByText("Does it for you.")).toBeInTheDocument();
    expect(screen.getByText("In the loop")).toBeInTheDocument();
  });

  it("renders nothing without slides", () => {
    const { container } = render(<FeatureScroll slides={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("registers property controls for the Framer panel", () => {
    const controls = getPropertyControls(FeatureScroll);

    expect(Object.keys(controls ?? {})).toEqual(
      expect.arrayContaining([
        "slides",
        "titleSlot",
        "descriptionSlot",
        "linkSlot",
        "tagSlot",
        "padding",
        "background",
      ]),
    );
  });
});
