/* @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectNames, useProjects } from "./useProjects";

const callToolMock = vi.fn();
vi.mock("../api/rpc", () => ({
  callTool: (...args: unknown[]) => callToolMock(...args),
}));

describe("useProjects machine-readable pagination", () => {
  /* a returned function becomes a cleanup hook, so the mock must not be returned */
  beforeEach(() => {
    callToolMock.mockReset();
  });

  it("requests JSON with stats and merges every project page", async () => {
    callToolMock.mockImplementation(async (_name: string, args: Record<string, unknown>) => {
      if (args.offset === 0) {
        return {
          projects: [{ name: "alpha", root_path: "/alpha", indexed_at: "now", nodes: 3 }],
          has_more: true,
          next_offset: 1,
        };
      }
      return {
        projects: [{ name: "beta", root_path: "/beta", indexed_at: "now", nodes: 1 }],
        has_more: false,
      };
    });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.projects.map((p) => p.name)).toEqual(["alpha", "beta"]);
    expect(callToolMock).toHaveBeenCalledWith("list_projects", {
      format: "json",
      detail: "stats",
      limit: 500,
      offset: 0,
    });
    expect(callToolMock).toHaveBeenCalledWith("list_projects", {
      format: "json",
      detail: "stats",
      limit: 500,
      offset: 1,
    });
    expect(callToolMock).not.toHaveBeenCalledWith("get_graph_schema", expect.anything());
  });

  it("reports a page without pagination fields as an error", async () => {
    callToolMock.mockResolvedValue({ projects: [] });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Invalid pagination response");
  });

  it("asks for names as JSON without stats", async () => {
    callToolMock.mockResolvedValue({
      projects: [{ name: "alpha", root_path: "/alpha", indexed_at: "now" }],
      has_more: false,
    });

    const { result } = renderHook(() => useProjectNames());
    await waitFor(() => expect(result.current).toHaveLength(1));

    expect(callToolMock).toHaveBeenCalledWith("list_projects", {
      format: "json",
      limit: 500,
      offset: 0,
    });
  });
});
