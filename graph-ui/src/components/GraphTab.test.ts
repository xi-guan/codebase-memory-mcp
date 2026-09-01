import { describe, expect, it } from "vitest";
import { graphBudgetNotice } from "./GraphTab";
import type { GraphData } from "../lib/types";

describe("graphBudgetNotice", () => {
  it("reports how much of the graph the budget let through", () => {
    const data = {
      nodes: Array.from({ length: 2000 }, (_, id) => ({
        id,
        x: 0,
        y: 0,
        z: 0,
        label: "Function",
        name: `fn${id}`,
        size: 1,
        color: "#ffffff",
      })),
      edges: [],
      total_nodes: 43729,
    } satisfies GraphData;

    expect(graphBudgetNotice(data)).toEqual({ shown: "2,000", total: "43,729" });
  });

  it("stays quiet when the full graph is rendered", () => {
    const data = {
      nodes: [],
      edges: [],
      total_nodes: 0,
    } satisfies GraphData;

    expect(graphBudgetNotice(data)).toBeNull();
  });
});
