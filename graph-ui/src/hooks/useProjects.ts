import { useCallback, useEffect, useState } from "react";
import { callTool } from "../api/rpc";
import type { Project } from "../lib/types";

interface ProjectPage {
  projects?: Project[];
  has_more?: boolean;
  next_offset?: number;
}

const PAGE_LIMIT = 500;

function nextPageOffset(page: { has_more?: boolean; next_offset?: number }, offset: number) {
  if (typeof page.has_more !== "boolean") {
    throw new Error("Invalid pagination response");
  }
  if (!page.has_more) return null;
  if (!Number.isInteger(page.next_offset) || page.next_offset! <= offset) {
    throw new Error("Invalid pagination response");
  }
  return page.next_offset!;
}

async function fetchAllProjects(withStats: boolean): Promise<Project[]> {
  const projects: Project[] = [];
  let offset = 0;
  for (;;) {
    const page = await callTool<ProjectPage>("list_projects", {
      format: "json",
      ...(withStats ? { detail: "stats" } : {}),
      limit: PAGE_LIMIT,
      offset,
    });
    projects.push(...(page.projects ?? []));
    const next = nextPageOffset(page, offset);
    if (next === null) return projects;
    offset = next;
  }
}

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/* Names + paths only — one RPC, no per-project fan-out. The top bar needs the
 * project count and the recent slugs, not their contents. */
export function useProjectNames(): Project[] {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAllProjects(false)
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch(() => {
        /* the switcher degrades to "no recents"; the Projects tab reports it */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return projects;
}

/* detail:"stats" makes list_projects carry each project's node and edge counts,
 * so the landing page needs exactly one call — asking get_graph_schema per
 * project added 16 round-trips, one of them over a 680k-node database. */
export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await fetchAllProjects(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refresh: fetchProjects };
}
