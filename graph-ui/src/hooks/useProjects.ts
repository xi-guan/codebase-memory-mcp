import { useCallback, useEffect, useState } from "react";
import { callTool } from "../api/rpc";
import type { Project } from "../lib/types";

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
    callTool<{ projects: Project[] }>("list_projects")
      .then((result) => {
        if (!cancelled) setProjects(result.projects ?? []);
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

/* list_projects already carries each project's node and edge counts, so the
 * landing page needs exactly one call — asking get_graph_schema per project
 * added 16 round-trips, one of them over a 680k-node database. */
export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callTool<{ projects: Project[] }>("list_projects");
      setProjects(result.projects ?? []);
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
