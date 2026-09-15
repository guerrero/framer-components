import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getPropertyControls } from "@/mock";

import Tabs from "./Tabs";

describe("Tabs", () => {
  it("renders fallback tab buttons when no content is linked", () => {
    render(<Tabs />);

    expect(screen.getByRole("tab", { name: "Tab 1" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tab 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tab 3" })).toBeInTheDocument();
  });

  it("reads tab names from linked layers and switches panels on click", async () => {
    render(
      <Tabs
        contents={[
          <div key="first" title="First">
            First panel
          </div>,
          <div key="second" title="Second">
            Second panel
          </div>,
        ]}
      />,
    );

    expect(screen.getByRole("tab", { name: "First" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("First panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Second" }));

    expect(screen.getByRole("tab", { name: "Second" })).toHaveAttribute("aria-selected", "true");
    // Panel switches wait for the exit animation (AnimatePresence mode="wait").
    expect(await screen.findByText("Second panel")).toBeInTheDocument();
  });

  it("honors the initial tab prop", () => {
    render(
      <Tabs
        initialTab={1}
        contents={[
          <div key="first" title="First">
            First panel
          </div>,
          <div key="second" title="Second">
            Second panel
          </div>,
        ]}
      />,
    );

    expect(screen.getByRole("tab", { name: "Second" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves between tabs with the arrow keys", () => {
    render(
      <Tabs
        contents={[
          <div key="first" title="First">
            First panel
          </div>,
          <div key="second" title="Second">
            Second panel
          </div>,
        ]}
      />,
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "First" }), {
      key: "ArrowRight",
    });

    expect(screen.getByRole("tab", { name: "Second" })).toHaveAttribute("aria-selected", "true");
  });

  it("registers property controls for the Framer panel", () => {
    const controls = getPropertyControls(Tabs);

    expect(Object.keys(controls ?? {})).toEqual(
      expect.arrayContaining([
        "contents",
        "initialTab",
        "alignment",
        "animatePanels",
        "wrapperStyle",
        "tabStyle",
        "panelStyle",
      ]),
    );
  });
});
