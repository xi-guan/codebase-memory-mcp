/* Which projects this person opened last, and when. Local only — there is no
 * server-side notion of "recent", and no sync. */

const STORAGE_KEY = "cbm-recent-projects";
const KEEP = 10;

export interface RecentProject {
  name: string;
  openedAt: number;
}

export function loadRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentProject =>
          typeof r?.name === "string" && typeof r?.openedAt === "number",
      )
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, KEEP);
  } catch {
    return [];
  }
}

export function recordProjectOpen(name: string) {
  try {
    const next = [
      { name, openedAt: Date.now() },
      ...loadRecentProjects().filter((r) => r.name !== name),
    ].slice(0, KEEP);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode — recents are a convenience, not state worth failing over */
  }
}

export function forgetProject(name: string) {
  try {
    const next = loadRecentProjects().filter((r) => r.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
