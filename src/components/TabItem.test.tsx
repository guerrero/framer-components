import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getPropertyControls } from "@/mock";

import TabItem from "./TabItem";

describe("TabItem", () => {
  it("renders the linked content", () => {
    render(<TabItem tabName="Details" content={<span>Details panel</span>} />);

    expect(screen.getByText("Details panel")).toBeInTheDocument();
  });

  it("exposes the tab name for Tabs to read", () => {
    render(<TabItem tabName="Specs" content={<span>Specs panel</span>} />);

    expect(screen.getByText("Specs panel").parentElement).toHaveAttribute("data-tab-name", "Specs");
  });

  it("shows a placeholder when no content is linked", () => {
    render(<TabItem tabName="Empty" />);

    expect(screen.getByText(/Link the content for/)).toBeInTheDocument();
  });

  it("registers Name and Content controls for the Framer panel", () => {
    const controls = getPropertyControls(TabItem);

    expect(Object.keys(controls ?? {})).toEqual(expect.arrayContaining(["tabName", "content"]));
  });
});
