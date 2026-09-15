import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getPropertyControls } from "@/mock";

import PillButton from "./PillButton";

describe("PillButton", () => {
  it("renders the label prop", () => {
    render(<PillButton label="Save changes" />);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("applies the tint prop", () => {
    render(<PillButton tint="#FF0000" />);

    expect(screen.getByRole("button")).toHaveStyle({ backgroundColor: "rgb(255, 0, 0)" });
  });

  it("can be disabled", () => {
    render(<PillButton disabled />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("registers property controls for the Framer panel", () => {
    const controls = getPropertyControls(PillButton);

    expect(Object.keys(controls ?? {})).toEqual(
      expect.arrayContaining(["label", "tint", "textColor", "radius", "disabled"]),
    );
  });
});
