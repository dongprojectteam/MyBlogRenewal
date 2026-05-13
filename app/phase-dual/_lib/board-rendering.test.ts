import { describe, expect, it } from "vitest";

import { measurePhaseDualLayout } from "./board-rendering";

describe("phase dual board rendering helpers", () => {
  it("lays out twin boards side by side on desktop widths", () => {
    const layout = measurePhaseDualLayout(960, 2, 6);

    expect(layout.isStacked).toBe(false);
    expect(layout.gridBX).toBeGreaterThan(layout.gridAX + layout.boardPx);
    expect(layout.cssH).toBe(layout.gridAY + layout.boardPx + 16);
  });

  it("stacks twin boards on narrow screens", () => {
    const layout = measurePhaseDualLayout(390, 3, 5);

    expect(layout.isStacked).toBe(true);
    expect(layout.gridBX).toBe(layout.gridAX);
    expect(layout.gridBY).toBeGreaterThan(layout.gridAY + layout.boardPx);
    expect(layout.boardPx).toBeLessThanOrEqual(320);
  });
});
