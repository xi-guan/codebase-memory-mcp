// browser-local on purpose: the server has no notion of "recent"; the previous UI used the same key
const STORAGE_KEY = 'cbm-recent-projects';
export const RECENT_KEEP = 10;

/** Project names, most recently opened first. */
export function recentProjects(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        if (!Array.isArray(parsed)) return [];
        // the previous UI stored { name, openedAt } objects, already newest first
        return parsed.map((item: unknown) => (typeof item === 'string' ? item : (item as { name?: unknown } | null)?.name))
            .filter((name): name is string => typeof name === 'string' && name.length > 0).slice(0, RECENT_KEEP);
    } catch {
        return [];
    }
}

export function recordRecentProject(name: string): void {
    if (!name) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([name, ...recentProjects().filter(other => other !== name)].slice(0, RECENT_KEEP)));
    } catch {
        // private mode: recents are a convenience, not state worth failing over
    }
}
