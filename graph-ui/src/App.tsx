import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { GraphTab } from "./components/GraphTab";
import { StatsTab } from "./components/StatsTab";
import { ControlTab } from "./components/ControlTab";
import { useProjectNames } from "./hooks/useProjects";
import { useTheme } from "./hooks/useTheme";
import { loadRecentProjects, recordProjectOpen } from "./lib/recent";
import type { TabId } from "./lib/types";
import { useUiMessages, type UiMessages } from "./lib/i18n";

const TAB_IDS: TabId[] = ["graph", "stats", "control"];

interface RouteState {
  tab: TabId;
  project: string | null;
}

/* Read the active tab + selected project from the URL query string so the
 * current view survives refreshes and can be bookmarked or shared. */
function readRoute(): RouteState {
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get("tab");
  const tab = TAB_IDS.includes(rawTab as TabId) ? (rawTab as TabId) : "stats";
  const project = params.get("project");
  return { tab, project: project ? project : null };
}

/* Build the canonical URL for a route, preserving the path and hash. */
function routeUrl(tab: TabId, project: string | null): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (project) params.set("project", project);
  return `${window.location.pathname}?${params.toString()}${window.location.hash}`;
}

/* ── Theme toggle — the only theme control, and it is global ─── */

function ThemeToggle({ t }: { t: UiMessages }) {
  const [theme, setTheme] = useTheme();
  const options = [
    { id: "light", label: t.topBar.light, Icon: Sun },
    { id: "dark", label: t.topBar.dark, Icon: Moon },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t.topBar.theme}
      className="flex items-center h-7 p-0.5 gap-0.5 rounded-[7px] bg-secondary border border-border"
    >
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          aria-pressed={theme === id}
          title={label}
          className={`w-6 h-[22px] flex items-center justify-center rounded-[5px] ${
            theme === id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={13} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

/* ── Project switcher — Graph tab only ───────────────────────── */

function ProjectSwitcher({
  project,
  projectCount,
  recent,
  onPick,
  onShowAll,
  t,
}: {
  project: string;
  projectCount: number;
  recent: string[];
  onPick: (name: string) => void;
  onShowAll: () => void;
  t: UiMessages;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 h-7 pl-2.5 pr-2 bg-secondary border border-border hover:border-border-strong rounded-[7px] text-foreground"
      >
        <span className="font-mono text-[10px] uppercase tracking-[.09em] text-muted-foreground">
          {t.graph.selectedLabel}
        </span>
        <span className="font-mono text-[12px] max-w-[230px] truncate">{project}</span>
        <ChevronDown size={10} strokeWidth={1.4} className="text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-[34px] right-0 w-[312px] p-1.5 z-[60] rounded-[10px] bg-popover border border-border-strong shadow-[0_18px_44px_var(--cbm-shade)]"
        >
          <div className="px-2 pt-1.5 pb-2 font-mono text-[10px] uppercase tracking-[.09em] text-muted-foreground">
            {t.topBar.switchProject}
          </div>
          {recent.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setOpen(false);
                onPick(name);
              }}
              className="block w-full text-left px-2 py-1.5 rounded-md font-mono text-[12px] text-secondary-foreground hover:bg-secondary hover:text-foreground truncate"
            >
              {name}
            </button>
          ))}
          <div className="h-px bg-border my-1.5" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onShowAll();
            }}
            className="block w-full text-left px-2 py-1.5 rounded-md text-[12px] text-primary hover:bg-secondary"
          >
            {t.topBar.allProjects(projectCount)}
          </button>
        </div>
      )}
    </div>
  );
}

export function App() {
  const t = useUiMessages();
  const [route, setRoute] = useState<RouteState>(readRoute);
  const { tab: activeTab, project: selectedProject } = route;
  const allProjects = useProjectNames();

  /* Normalize the URL on first load so it always carries the current route. */
  useEffect(() => {
    const initial = readRoute();
    window.history.replaceState(null, "", routeUrl(initial.tab, initial.project));
  }, []);

  /* Sync state when the user navigates with the browser back/forward buttons. */
  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /* Change the route and push a history entry (skips no-op navigations). */
  const navigate = useCallback((tab: TabId, project: string | null) => {
    if (tab === "graph" && project) recordProjectOpen(project);
    const url = routeUrl(tab, project);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url === current) return;
    window.history.pushState(null, "", url);
    setRoute({ tab, project });
  }, []);

  const tabs: { id: TabId; label: string }[] = [
    { id: "stats", label: t.tabs.projects },
    { id: "graph", label: t.tabs.graph },
    { id: "control", label: t.tabs.control },
  ];

  /* Five most recent slugs, minus the one already showing in the pill. */
  const recentSlugs = loadRecentProjects()
    .map((r) => r.name)
    .filter((name) => name !== selectedProject)
    .slice(0, 5);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="h-12 shrink-0 flex items-stretch pl-4 pr-2.5 bg-sidebar border-b border-border">
        <div className="flex items-center gap-[9px] pr-[26px] shrink-0">
          <span className="w-[7px] h-[7px] rounded-full bg-ok cbm-pulse" />
          <span className="text-[13px] font-bold tracking-[-0.028em]">
            Codebase Memory
          </span>
        </div>

        <nav className="flex items-stretch gap-0.5">
          {tabs.map((tab) => {
            const disabled = tab.id === "graph" && !selectedProject;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id, tab.id === "stats" ? null : selectedProject)}
                disabled={disabled}
                aria-current={active ? "page" : undefined}
                title={disabled ? t.topBar.selectProjectFirst : undefined}
                className={`px-[13px] text-[13px] ${
                  disabled
                    ? "text-faint cursor-not-allowed"
                    : active
                      ? "text-primary font-semibold shadow-[inset_0_-2px_0_0_var(--cbm-primary)]"
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {activeTab === "graph" && selectedProject && (
            <ProjectSwitcher
              project={selectedProject}
              projectCount={allProjects.length}
              recent={recentSlugs}
              onPick={(name) => navigate("graph", name)}
              onShowAll={() => navigate("stats", null)}
              t={t}
            />
          )}
          <ThemeToggle t={t} />
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {activeTab === "graph" ? (
          <GraphTab project={selectedProject} />
        ) : activeTab === "control" ? (
          <ControlTab />
        ) : (
          <StatsTab onSelectProject={(p) => navigate("graph", p)} />
        )}
      </main>
    </div>
  );
}
