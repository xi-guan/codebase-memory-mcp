import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ArrowUp, ChevronRight, Folder, Plus, RefreshCw, Search, X } from "lucide-react";
import { useProjects } from "../hooks/useProjects";
import { loadRecentProjects, forgetProject } from "../lib/recent";
import { useUiMessages, type UiMessages } from "../lib/i18n";

interface StatsTabProps {
  onSelectProject: (project: string) => void;
}

/* Big numbers on the summary line read as scale, not as exact counts. */
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatAgo(openedAt: number, t: UiMessages): string {
  const minutes = Math.floor((Date.now() - openedAt) / 60_000);
  if (minutes < 1) return t.projects.justNow;
  if (minutes < 60) return t.projects.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.projects.hoursAgo(hours);
  return t.projects.daysAgo(Math.floor(hours / 24));
}

/* ── Health dot ─────────────────────────────────────────── */

function HealthDot({ name }: { name: string }) {
  const t = useUiMessages();
  const [status, setStatus] = useState<"loading" | "healthy" | "corrupt" | "missing">("loading");
  const [info, setInfo] = useState("");

  useEffect(() => {
    fetch(`/api/project-health?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.status ?? "corrupt");
        if (d.nodes !== undefined) {
          const sizeMB = ((d.size_bytes ?? 0) / 1024 / 1024).toFixed(1);
          setInfo(`${d.nodes.toLocaleString()} nodes, ${d.edges.toLocaleString()} edges, ${sizeMB} MB`);
        } else if (d.reason) {
          setInfo(d.reason);
        }
      })
      .catch(() => setStatus("corrupt"));
  }, [name]);

  const dotColor =
    status === "healthy" ? "var(--cbm-ok)" :
    status === "missing" ? "var(--cbm-warn)" :
    status === "corrupt" ? "var(--cbm-destructive)" : "var(--cbm-faint)";

  const label =
    status === "healthy" ? t.projects.healthHealthy :
    status === "missing" ? t.projects.healthMissing :
    status === "corrupt" ? t.projects.healthCorrupt : t.projects.healthChecking;

  return (
    <span className="group relative inline-flex items-center" title={info ? `${label} — ${info}` : label}>
      <span
        className="w-[7px] h-[7px] rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-label={label}
        role="img"
      />
    </span>
  );
}

/* ── ADR modal ──────────────────────────────────────────── */

function AdrButton({ project }: { project: string }) {
  const t = useUiMessages();
  const [hasAdr, setHasAdr] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  const fetchAdr = useCallback(async () => {
    try {
      const res = await fetch(`/api/adr?project=${encodeURIComponent(project)}`);
      const data = await res.json();
      setHasAdr(data.has_adr ?? false);
      if (data.content) setContent(data.content);
      if (data.updated_at) setUpdatedAt(data.updated_at);
    } catch { setHasAdr(false); }
  }, [project]);

  useEffect(() => { fetchAdr(); }, [fetchAdr]);

  const save = async (nextContent = content) => {
    setSaving(true);
    try {
      await fetch("/api/adr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, content: nextContent }),
      });
      await fetchAdr();
      setOpen(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (hasAdr === null) return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); fetchAdr(); }}
        className={`h-6 px-2 rounded-[5px] border border-border bg-card font-mono text-[10px] uppercase tracking-[.07em] hover:border-border-strong ${
          hasAdr ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {hasAdr ? "ADR" : t.projects.addAdr}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-shade backdrop-blur-[3px]"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          <div
            className="w-[640px] max-h-[768px] flex flex-col overflow-hidden rounded-xl bg-popover border border-border-strong shadow-[0_32px_72px_#00000070]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-[18px] pb-4 border-b border-border flex items-start justify-between gap-4">
              <div className="flex flex-col gap-[5px] min-w-0">
                <h2 className="m-0 text-[16px] font-bold tracking-[-0.028em]">{t.adr.title}</h2>
                <p className="m-0 font-mono text-[11px] text-muted-foreground truncate">{project}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X size={12} strokeWidth={2.2} />
              </button>
            </div>
            <div className="p-5 flex-1 min-h-0 flex flex-col gap-2">
              {updatedAt && (
                <p className="m-0 font-mono text-[10px] uppercase tracking-[.06em] text-muted-foreground">
                  {t.adr.lastUpdated} {updatedAt}
                </p>
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"# Architecture Decision Record\n\n## Context\n...\n\n## Decision\n...\n\n## Consequences\n..."}
                className="flex-1 min-h-[300px] resize-none rounded-lg bg-input border border-border px-3 py-2.5 font-mono text-[12px] leading-[1.65] text-foreground outline-none focus:border-border-strong"
              />
            </div>
            <div className="px-5 py-3 border-t border-border bg-card flex items-center justify-end gap-2">
              {hasAdr && (
                <button
                  onClick={async () => { setContent(""); await save(""); }}
                  className="h-[30px] px-3 rounded-[7px] border border-border text-[12px] text-destructive hover:border-destructive"
                >
                  {t.common.delete}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-[30px] px-3.5 rounded-[7px] border border-border text-[12px] text-secondary-foreground hover:border-border-strong hover:text-foreground"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => save()}
                disabled={saving}
                className="h-[30px] px-3.5 rounded-[7px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-accent disabled:opacity-40"
              >
                {saving ? t.common.saving : t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Index modal ────────────────────────────────────────── */

function joinPath(base: string, dir: string): string {
  if (!base || base === "/") return `/${dir}`;
  if (/^[A-Za-z]:[\\/]?$/.test(base)) return `${base[0]}:/${dir}`;
  const slash = base.includes("\\") && !base.includes("/") ? "\\" : "/";
  return `${base.replace(/[\\/]+$/, "")}${slash}${dir}`;
}

function CreateIndexModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useUiMessages();
  const [currentPath, setCurrentPath] = useState("");
  const [dirs, setDirs] = useState<string[]>([]);
  const [roots, setRoots] = useState<string[]>(["/"]);
  const [parentPath, setParentPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  /* Path whose listing is currently shown. Lets the typed-path effect skip a
   * redundant re-fetch after browse() sets currentPath itself. */
  const lastBrowsedRef = useRef<string>("");

  const browse = useCallback(async (path?: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const q = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await fetch(`/api/browse${q}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      lastBrowsedRef.current = data.path ?? "";
      setCurrentPath(data.path ?? "");
      setDirs((data.dirs ?? []).sort());
      setRoots(data.roots ?? ["/"]);
      setParentPath(data.parent ?? "/");
    } catch (e) {
      /* Silent (typed-path) refreshes keep the last good listing instead of
       * flashing an error while the user is still typing a path. */
      if (!silent) setError(e instanceof Error ? e.message : "Browse failed");
    }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { browse(); }, [browse]);
  useEffect(() => { filterRef.current?.focus(); }, []);

  /* Esc closes the modal, matching the backdrop click. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Windows only: when the user types a drive path into the Repository path
   * field, refresh the folder listing to match (debounced). On Windows, typing
   * is the way to switch drives, and without this the breadcrumb and path box
   * updated but the directory list stayed stale (e.g. typing "D:/" still showed
   * the previous drive's folders). POSIX navigation is left unchanged. */
  useEffect(() => {
    if (!currentPath || currentPath === lastBrowsedRef.current) return;
    if (!/^[A-Za-z]:/.test(currentPath.replace(/\\/g, "/"))) return;
    const id = setTimeout(() => { void browse(currentPath, { silent: true }); }, 350);
    return () => clearTimeout(id);
  }, [currentPath, browse]);

  const filteredDirs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return dirs;
    return dirs.filter((d) => d.toLowerCase().includes(q));
  }, [dirs, filter]);

  useEffect(() => { setActiveIndex(0); }, [filter, currentPath]);

  const submit = async (path = currentPath) => {
    if (!path) return;
    setSubmitting(true); setError(null);
    try {
      const body: { root_path: string; project_name?: string } = { root_path: path };
      if (projectName.trim()) body.project_name = projectName.trim();
      const res = await fetch("/api/index", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onCreated(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  const onFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filteredDirs.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filteredDirs.length > 0) {
      e.preventDefault();
      const dir = filteredDirs.length === 1 ? filteredDirs[0] : filteredDirs[activeIndex];
      if (filteredDirs.length === 1) void submit(joinPath(currentPath, dir));
      else void browse(joinPath(currentPath, dir));
    }
  };

  /* Breadcrumb segments */
  const displayPath = currentPath.replace(/\\/g, "/");
  const segments = displayPath.split("/").filter(Boolean);
  /* A Windows drive path ("C:/Users/rap") has no unified "/" root — its first
   * segment is the drive letter. Build crumb targets accordingly so clicking a
   * segment navigates to a real directory instead of a bogus "/C:/..." path
   * that the backend rejects as "not a directory". */
  const isWinPath = /^[A-Za-z]:$/.test(segments[0] ?? "");
  const crumbPath = (i: number): string => {
    const parts = segments.slice(0, i + 1);
    if (isWinPath) return parts.length === 1 ? `${parts[0]}/` : parts.join("/");
    return "/" + parts.join("/");
  };

  /* Root/drive quick-jump buttons. On Windows the POSIX "/" root is meaningless
   * — browsing it returns an empty listing — so drop it and offer drive roots
   * instead. An older backend may not enumerate drives, so always include the
   * current drive; other drives stay reachable by typing a path. */
  const displayRoots = (() => {
    if (!isWinPath) return roots;
    const drives = Array.from(new Set(
      roots.filter((r) => /^[A-Za-z]:[\\/]?$/.test(r)).map((r) => `${r[0].toUpperCase()}:/`),
    ));
    const curRoot = `${displayPath[0].toUpperCase()}:/`;
    if (!drives.includes(curRoot)) drives.unshift(curRoot);
    return drives;
  })();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-shade backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="w-[640px] max-h-[768px] flex flex-col overflow-hidden rounded-xl bg-popover border border-border-strong shadow-[0_32px_72px_#00000070]"
        style={{ height: "min(82vh, 768px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-[18px] pb-4 border-b border-border flex flex-col gap-[5px] shrink-0">
          <h2 className="m-0 text-[16px] font-bold tracking-[-0.028em]">
            {t.index.selectRepositoryFolder}
          </h2>
          <p className="m-0 text-[12px] leading-[1.5] text-muted-foreground">
            {t.index.instructions}
          </p>
        </div>

        {/* One baseline grid: label over field, both columns aligned. */}
        <div className="px-5 py-3.5 grid grid-cols-[1fr_200px] gap-4 border-b border-border shrink-0">
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
              {t.index.repositoryPath}
            </span>
            <input
              aria-label={t.index.repositoryPath}
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && /^[A-Za-z]:/.test(currentPath.replace(/\\/g, "/"))) { e.preventDefault(); void browse(currentPath); } }}
              className="h-7 bg-transparent border-0 outline-none font-mono text-[13px] font-semibold text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
              {t.index.projectName}
            </span>
            <input
              aria-label={t.index.projectName}
              value={projectName}
              placeholder={t.index.projectNamePlaceholder}
              onChange={(e) => setProjectName(e.target.value)}
              title={t.index.projectNameHelp}
              className="h-7 px-[9px] rounded-md bg-input border border-border outline-none focus:border-border-strong font-mono text-[12px] text-foreground"
            />
          </label>
        </div>

        <div className="px-5 pt-3 pb-2.5 flex items-center gap-2 shrink-0">
          <div className="flex-1 flex items-center gap-[7px] h-[30px] px-2.5 bg-input border border-border rounded-[7px] focus-within:border-border-strong">
            <Search size={12} strokeWidth={2} className="shrink-0 text-muted-foreground" />
            <input
              ref={filterRef}
              value={filter}
              placeholder={t.index.filterFolders}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={onFilterKeyDown}
              className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[12px] text-foreground"
            />
          </div>
          {/* Drive roots: on Windows this is the only way back to a drive. */}
          {displayRoots.map((root) => (
            <button
              key={root}
              aria-label={t.index.browseRoot(root)}
              onClick={() => browse(root)}
              className="h-[30px] px-2.5 rounded-md border border-border bg-card font-mono text-[11px] text-muted-foreground hover:text-foreground hover:border-border-strong"
            >
              {root}
            </button>
          ))}
        </div>

        {/* Ancestor segments stay clickable — the path field above is editable,
            so the colouring alone can't carry navigation. */}
        <div className="px-5 pb-2.5 flex items-center gap-0.5 overflow-x-auto font-mono text-[11px] shrink-0">
          {!isWinPath && (
            <button onClick={() => browse("/")} className="shrink-0 text-primary">/</button>
          )}
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-0.5 shrink-0">
              {(i > 0 || !isWinPath) && <span className="text-faint">/</span>}
              <button
                onClick={() => browse(crumbPath(i))}
                className={i === segments.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground hover:text-primary"}
              >
                {seg}
              </button>
            </span>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
          {currentPath !== "/" && (
            <button
              onClick={() => browse(parentPath)}
              aria-label={t.index.goUp}
              className="flex items-center gap-2.5 w-full h-8 px-2 rounded-md hover:bg-secondary"
            >
              <ArrowUp size={13} strokeWidth={2} className="shrink-0 text-muted-foreground" />
              <span className="font-mono text-[12px] text-muted-foreground">..</span>
            </button>
          )}
          {loading ? (
            <p className="text-[12px] text-muted-foreground text-center py-8">{t.common.loading}</p>
          ) : filteredDirs.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-8">{t.index.noSubdirectories}</p>
          ) : (
            filteredDirs.map((d, i) => (
              <div
                key={d}
                className={`cbm-row flex items-center gap-2.5 h-8 px-2 rounded-md ${
                  i === activeIndex ? "bg-secondary" : "hover:bg-secondary"
                }`}
              >
                <Folder size={13} strokeWidth={2} className="shrink-0 text-faint" />
                <button
                  aria-label={t.index.browseRoot(d)}
                  onClick={() => browse(joinPath(currentPath, d))}
                  className="flex-1 min-w-0 text-left font-mono text-[12px] text-foreground truncate"
                >
                  {d}
                </button>
                <button
                  aria-label={t.index.indexDirectory(d)}
                  onClick={() => submit(joinPath(currentPath, d))}
                  disabled={submitting}
                  className="cbm-hov transition-opacity duration-[120ms] h-[22px] px-2 inline-flex items-center rounded-[5px] border border-border bg-card font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-primary disabled:opacity-30"
                >
                  {t.index.indexChip}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-card shrink-0">
          {error && (
            <p className="mb-2.5 text-[11px] text-destructive">{error}</p>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-[11px] text-muted-foreground truncate">
              {t.index.willIndex(currentPath)}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onClose}
                className="h-[30px] px-3.5 rounded-[7px] border border-border text-[12px] text-secondary-foreground hover:border-border-strong hover:text-foreground"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => submit()}
                disabled={submitting || !currentPath}
                className="h-[30px] px-3.5 rounded-[7px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-accent disabled:opacity-40"
              >
                {submitting ? t.index.starting : t.index.indexThisFolder}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Index Progress ─────────────────────────────────────── */

export function IndexProgress({ onDone }: { onDone: () => void }) {
  const t = useUiMessages();
  const [jobs, setJobs] = useState<{ slot: number; status: string; path: string; error?: string }[]>([]);
  const [hasActive, setHasActive] = useState(true);
  useEffect(() => {
    if (!hasActive) return;
    const poll = setInterval(async () => {
      try {
        const data = await (await fetch("/api/index-status")).json();
        setJobs(data);
        const stillIndexing = data.some((j: { status: string }) => j.status === "indexing");
        /* Empty list = job not visible: the backend keeps finished jobs listed
           as "done"/"error", so [] mid-index only happens on transient state
           loss (e.g. server restart) — keep polling, don't treat as done. */
        if (data.length > 0 && !stillIndexing) {
          setHasActive(false);
          const hasErrors = data.some((j: { status: string }) => j.status === "error");
          if (!hasErrors) {
            onDone();
          }
        }
      } catch (error) {
        console.error("[IndexProgress] Poll failed:", error);
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [onDone, hasActive]);

  const active = jobs.filter((j) => j.status === "indexing");
  const errors = jobs.filter((j) => j.status === "error");

  if (active.length === 0 && errors.length === 0) return null;

  return (
    <div className="rounded-[10px] border border-border bg-card p-4 mb-5">
      {active.map((j) => (
        <div key={j.slot} className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin shrink-0" />
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-semibold text-primary">{t.projects.indexingInProgress}</p>
            <p className="m-0 font-mono text-[11px] text-muted-foreground truncate">{j.path}</p>
          </div>
        </div>
      ))}
      {errors.map((j) => (
        <div key={j.slot} className="flex items-start gap-3 mt-3 first:mt-0 p-3 rounded-lg border border-destructive text-destructive">
          <div className="flex-1 min-w-0">
            <p className="m-0 text-[12px] font-semibold">{t.projects.indexingFailed}</p>
            <p className="m-0 font-mono text-[11px] truncate">{j.path}</p>
            {j.error && <p className="m-0 mt-1 font-mono text-[10px] opacity-75">{j.error}</p>}
          </div>
        </div>
      ))}
      {errors.length > 0 && (
        <div className="flex justify-end mt-3">
          <button
            onClick={onDone}
            className="h-6 px-2.5 rounded-[5px] border border-border text-[11px] text-destructive hover:border-destructive"
          >
            {t.common.dismiss}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Projects landing ───────────────────────────────────── */

export function StatsTab({ onSelectProject }: StatsTabProps) {
  const t = useUiMessages();
  const { projects, loading, error, refresh } = useProjects();
  const [showModal, setShowModal] = useState(false);
  const [indexing, setIndexing] = useState(false);

  /* Schema totals are frequently unavailable; the clause is then simply
   * absent from the summary line — never a placeholder. */
  const totals = useMemo(() => {
    let nodes = 0, edges = 0, known = false;
    for (const p of projects) {
      if (p.nodes === undefined && p.edges === undefined) continue;
      known = true;
      nodes += p.nodes ?? 0;
      edges += p.edges ?? 0;
    }
    return known ? { nodes, edges } : null;
  }, [projects]);

  const nodeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      if (p.nodes !== undefined) map.set(p.name, p.nodes);
    }
    return map;
  }, [projects]);

  const paths = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.name, p.root_path);
    return map;
  }, [projects]);

  /* Recents are local state; a project deleted elsewhere would linger. */
  const recent = useMemo(
    () => loadRecentProjects().filter((r) => paths.has(r.name)).slice(0, 3),
    [paths],
  );

  const deleteProject = useCallback(async (name: string) => {
    if (!confirm(t.projects.deleteConfirm(name))) return;
    try {
      await fetch(`/api/project?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      forgetProject(name);
      refresh();
    } catch { /* */ }
  }, [refresh, t.projects]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-10 pt-[30px] pb-11">
        <div className="flex items-end justify-between gap-6 pb-0.5">
          <div className="flex flex-col gap-[7px]">
            <h1 className="m-0 text-[21px] font-bold tracking-[-0.032em]">
              {t.projects.indexedProjects}
            </h1>
            <div className="font-mono text-[11px] tracking-[.02em] text-muted-foreground">
              {t.projects.repositories(projects.length)}
              {totals && ` · ${t.projects.totals(compact.format(totals.nodes), compact.format(totals.edges))}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 h-[30px] px-3.5 rounded-[7px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-accent"
            >
              <Plus size={12} strokeWidth={2.4} />
              {t.index.newIndex}
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] border border-border text-[12px] text-secondary-foreground hover:border-border-strong hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw size={12} strokeWidth={2} />
              {t.common.refresh}
            </button>
          </div>
        </div>

        {indexing && (
          <div className="pt-5">
            <IndexProgress onDone={() => { setIndexing(false); refresh(); }} />
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-[10px] border border-destructive p-4">
            <p className="m-0 text-[13px] text-destructive">{error}</p>
          </div>
        )}

        {!loading && projects.length === 0 && !error ? (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <p className="m-0 text-[13px] text-muted-foreground">{t.projects.noIndexedProjects}</p>
            <button
              onClick={() => setShowModal(true)}
              className="h-[30px] px-3.5 rounded-[7px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-accent"
            >
              {t.projects.indexFirstRepository}
            </button>
          </div>
        ) : (
          /* minmax(0,1fr), not 1fr: a very long path has a large min-content
             contribution that would otherwise widen the track. */
          <div className="grid grid-cols-[minmax(0,1fr)_336px] gap-10 items-start pt-5">
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline justify-between pr-2 pb-[9px] border-b border-border">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                  {t.projects.allProjects}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[.05em] text-muted-foreground">
                  {projects.length}
                </span>
              </div>

              {projects.map((p) => {
                const name = p.name;
                const nodes = nodeCounts.get(name);
                return (
                  <div
                    key={name}
                    onClick={() => onSelectProject(name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") onSelectProject(name); }}
                    className="cbm-row flex items-center gap-3 h-[38px] pr-2 border-b border-border cursor-pointer hover:bg-card"
                  >
                    <div className="w-6 shrink-0 flex justify-center">
                      <HealthDot name={name} />
                    </div>
                    <span className="shrink-0 text-[14px] tracking-[-0.015em] whitespace-nowrap">
                      {name}
                    </span>
                    <span className="flex-1 min-w-0 font-mono text-[11px] text-muted-foreground truncate">
                      {p.root_path}
                    </span>
                    {nodes !== undefined && (
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[.05em] text-muted-foreground whitespace-nowrap">
                        {t.projects.nodeCount(nodes.toLocaleString())}
                      </span>
                    )}
                    <div className="cbm-hov flex items-center gap-1 shrink-0 transition-opacity duration-[120ms]">
                      <AdrButton project={name} />
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteProject(name); }}
                        title={t.projects.deleteTitle}
                        aria-label={t.projects.deleteTitle}
                        className="w-6 h-6 flex items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive"
                      >
                        <X size={11} strokeWidth={2.2} />
                      </button>
                    </div>
                    <span className="flex items-center justify-end gap-1.5 w-[84px] shrink-0 text-[11px] font-semibold text-primary">
                      {t.projects.viewGraph}
                      <ChevronRight size={12} strokeWidth={2.2} />
                    </span>
                  </div>
                );
              })}

              <div className="pt-3 font-mono text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                {t.projects.rowFootnote}
              </div>
            </div>

            <div className="flex flex-col gap-[11px] min-w-0">
              <div className="pb-[9px] border-b border-border">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                  {t.projects.recentlyOpened}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {recent.map((r) => {
                  const nodes = nodeCounts.get(r.name);
                  return (
                    <div
                      key={r.name}
                      onClick={() => onSelectProject(r.name)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") onSelectProject(r.name); }}
                      className="flex flex-col gap-[9px] px-4 pt-3.5 pb-[15px] min-w-0 rounded-[10px] bg-card border border-border hover:border-primary cursor-pointer"
                    >
                      <div className="flex items-center gap-[9px] min-w-0">
                        <span className="w-[7px] h-[7px] shrink-0 rounded-full bg-ok" />
                        <span className="flex-1 min-w-0 text-[14px] tracking-[-0.015em] truncate">
                          {r.name}
                        </span>
                        <ChevronRight size={13} strokeWidth={2.2} className="shrink-0 text-primary" />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground truncate">
                        {paths.get(r.name)}
                      </span>
                      <div className="flex items-center gap-[9px] pt-0.5 font-mono text-[10px] uppercase tracking-[.05em] text-muted-foreground whitespace-nowrap">
                        {nodes !== undefined && (
                          <>
                            <span>{t.projects.nodeCount(nodes.toLocaleString())}</span>
                            <span className="text-border-strong">|</span>
                          </>
                        )}
                        <span>{formatAgo(r.openedAt, t)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      {showModal && <CreateIndexModal onClose={() => setShowModal(false)} onCreated={() => { setIndexing(true); refresh(); }} />}
    </div>
  );
}
