import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { RuleBadge } from "./rule-badge";

describe("RuleBadge", () => {
  it("renders the rule label and icon", () => {
    const { getByText, getByAltText } = render(createElement(RuleBadge, { rule: "rotate_cw" }));

    expect(getByText("시계 회전")).toBeInTheDocument();
    expect(getByText("Rotate CW")).toBeInTheDocument();
    expect(getByAltText("시계 회전")).toBeInTheDocument();
  });
});
