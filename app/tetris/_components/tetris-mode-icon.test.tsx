import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { TetrisModeIcon } from "./tetris-mode-icon";

describe("TetrisModeIcon", () => {
  it("renders a stable 3x3 mode glyph", () => {
    const { container } = render(createElement(TetrisModeIcon, { mode: "marathon" }));

    expect(container.querySelectorAll(".tetris-mode-icon i")).toHaveLength(9);
    expect(container.querySelectorAll(".tetris-mode-icon i.is-filled")).toHaveLength(4);
  });
});
