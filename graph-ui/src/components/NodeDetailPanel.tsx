import { useMemo, useState, useEffect } from "react";
import { X } from "lucide-react";
import { colorForLabel } from "../lib/colors";
import { useTheme } from "../hooks/useTheme";
import { useUiMessages, type UiMessages } from "../lib/i18n";
import { callTool } from "../api/rpc";
import type { GraphNode, GraphEdge, RepoInfo } from "../lib/types";

interface Connection {
  node: GraphNode;
  edgeType: string;
  direction: "inbound" | "outbound";
}

interface NodeDetailPanelProps {
  node: GraphNode;
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  project: string | null;
  repoInfo: RepoInfo | null;
  onClose: () => void;
  onNavigate: (node: GraphNode) => void;
}

interface SnippetResult {
  source?: string;
  start_line?: number;
  end_line?: number;
}

/* Rows past this collapse behind a "+ N more references" button. */
const VISIBLE_REFERENCES = 25;

function lineSuffix(node: GraphNode): string {
  if (!node.start_line) return "";
  const end = node.end_line && node.end_line !== node.start_line ? `-L${node.end_line}` : "";
  return `#L${node.start_line}${end}`;
}

/* Encode each path segment so an unusual file_path can't break (or escape) the
 * URL. The scheme is already https-forced by the backend (/api/repo-info);
 * this is defense-in-depth on the path. */
function encodePath(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}

/* GitHub (or GitLab) deep-link, or null when we lack remote/path/line info. */
function githubUrl(node: GraphNode, repoInfo: RepoInfo | null): string | null {
  if (!repoInfo?.blob_base || !node.file_path) return null;
  return `${repoInfo.blob_base}/${encodePath(node.file_path)}${lineSuffix(node)}`;
}

function lineRange(node: GraphNode): string | null {
  if (!node.start_line) return null;
  if (node.end_line && node.end_line !== node.start_line)
    return `:${node.start_line}-${node.end_line}`;
  return `:${node.start_line}`;
}

function lineCount(node: GraphNode): number | null {
  if (!node.start_line || !node.end_line) return null;
  return node.end_line - node.start_line + 1;
}

/* The file extension doubles as the language tag; there is no language field
 * on the node and the extension is what the indexer keyed off anyway. */
function languageTag(node: GraphNode): string | null {
  const base = node.file_path?.split("/").pop();
  /* no dot means no extension: Makefile / Dockerfile are not languages */
  if (!base || !base.includes(".")) return null;
  return base.split(".").pop() || null;
}

export function NodeDetailPanel({
  node,
  allNodes,
  allEdges,
  project,
  repoInfo,
  onClose,
  onNavigate,
}: NodeDetailPanelProps) {
  const t = useUiMessages();
  const [theme] = useTheme();
  const [code, setCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  /* Reset the fetched code whenever the selected node changes. */
  useEffect(() => {
    setCode(null);
    setCodeError(null);
    setCodeLoading(false);
  }, [node.id]);

  const canFetchCode = Boolean(project && node.qualified_name);
  const ghUrl = githubUrl(node, repoInfo);
  const dotColor = colorForLabel(node.label, theme);
  const lines = lineCount(node);
  const language = languageTag(node);

  const loadCode = async () => {
    if (!project || !node.qualified_name) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = await callTool<SnippetResult>("get_code_snippet", {
        qualified_name: node.qualified_name,
        project,
      });
      setCode(res.source ?? "(source not available)");
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : "Failed to load code");
    } finally {
      setCodeLoading(false);
    }
  };

  const connections = useMemo(() => {
    const nodeMap = new Map<number, GraphNode>();
    for (const n of allNodes) nodeMap.set(n.id, n);
    const conns: Connection[] = [];
    for (const edge of allEdges) {
      if (edge.source === node.id) {
        const target = nodeMap.get(edge.target);
        if (target) conns.push({ node: target, edgeType: edge.type, direction: "outbound" });
      }
      if (edge.target === node.id) {
        const source = nodeMap.get(edge.source);
        if (source) conns.push({ node: source, edgeType: edge.type, direction: "inbound" });
      }
    }
    return conns;
  }, [node, allNodes, allEdges]);

  const outbound = connections.filter((c) => c.direction === "outbound");
  const inbound = connections.filter((c) => c.direction === "inbound");

  const groupByType = (conns: Connection[]) => {
    const g = new Map<string, Connection[]>();
    for (const c of conns) g.set(c.edgeType, [...(g.get(c.edgeType) ?? []), c]);
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  };

  return (
    <div className="w-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-[5] px-4 py-3.5 flex flex-col gap-[9px] bg-card border-b border-border">
        <div className="flex items-start gap-2.5">
          <span
            className="w-2 h-2 mt-[5px] shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <div className="flex-1 min-w-0 flex flex-col gap-[5px]">
            <div className="text-[15px] font-bold tracking-[-0.025em] truncate">
              {node.qualified_name ?? node.name}
            </div>
            <div className="flex items-center gap-[7px]">
              <span className="h-[17px] px-1.5 inline-flex items-center rounded bg-secondary text-secondary-foreground font-mono text-[10px] uppercase tracking-[.07em]">
                {node.label}
              </span>
              {language && (
                <span className="font-mono text-[10px] uppercase tracking-[.06em] text-muted-foreground">
                  {language}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            title={t.common.close}
            aria-label={t.common.close}
            className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={12} strokeWidth={2.2} />
          </button>
        </div>

        {node.file_path && (
          <div className="font-mono text-[11px] leading-[1.5] text-muted-foreground break-all">
            {node.file_path}
            {lineRange(node) && <span className="text-primary"> {lineRange(node)}</span>}
          </div>
        )}

        {ghUrl && (
          <a
            href={ghUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-primary hover:underline w-fit"
          >
            {t.detail.openOnGitHub} ↗
          </a>
        )}
      </div>

      {/* Degrees + source */}
      <div className="px-4 py-3.5 flex flex-col gap-3 border-b border-border">
        <div className="grid grid-cols-3">
          {[
            { label: t.detail.out, value: outbound.length },
            { label: t.detail.in, value: inbound.length },
            { label: t.detail.total, value: connections.length },
          ].map((d) => (
            <div key={d.label} className="flex flex-col gap-[3px]">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                {d.label}
              </span>
              <span className="font-mono text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
                {d.value}
              </span>
            </div>
          ))}
        </div>

        {canFetchCode && (
          <button
            onClick={code ? () => setCode(null) : loadCode}
            disabled={codeLoading}
            className="flex items-center justify-between w-full h-7 px-2.5 rounded-[7px] bg-secondary border border-border hover:border-border-strong text-[12px] text-foreground disabled:opacity-50"
          >
            <span>
              {codeLoading ? t.common.loading : code ? t.detail.hideSource : t.detail.showSource}
            </span>
            {lines !== null && (
              <span className="font-mono text-[10px] uppercase tracking-[.07em] text-muted-foreground">
                {t.detail.lines(lines.toLocaleString())}
              </span>
            )}
          </button>
        )}

        {codeError && <p className="text-[11px] text-destructive">{codeError}</p>}

        {code && (
          <pre className="m-0 px-3 py-[11px] max-h-[250px] overflow-x-auto overflow-y-auto rounded-lg bg-input border border-border font-mono text-[11px] leading-[1.65] text-secondary-foreground">
            {code}
          </pre>
        )}
      </div>

      {/* References */}
      {outbound.length > 0 && (
        <ConnectionSection
          key={`out-${node.id}`}
          title={t.detail.references}
          count={outbound.length}
          arrow="→"
          groups={groupByType(outbound)}
          onNavigate={onNavigate}
          theme={theme}
          t={t}
        />
      )}
      {inbound.length > 0 && (
        <ConnectionSection
          key={`in-${node.id}`}
          title={t.detail.referencedBy}
          count={inbound.length}
          arrow="←"
          groups={groupByType(inbound)}
          onNavigate={onNavigate}
          theme={theme}
          t={t}
        />
      )}
      {connections.length === 0 && (
        <p className="px-4 py-8 text-center text-[12px] text-muted-foreground">
          {t.detail.noConnections}
        </p>
      )}
    </div>
  );
}

function ConnectionSection({
  title,
  count,
  arrow,
  groups,
  onNavigate,
  theme,
  t,
}: {
  title: string;
  count: number;
  arrow: string;
  groups: [string, Connection[]][];
  onNavigate: (n: GraphNode) => void;
  theme: "light" | "dark";
  t: UiMessages;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  return (
    <div className="px-4 py-3.5 flex flex-col gap-2.5 border-b border-border">
      <div className="flex items-center gap-[7px]">
        <span className="text-[12px] font-semibold text-foreground">{title}</span>
        <span className="h-[17px] min-w-[17px] px-[5px] inline-flex items-center justify-center rounded bg-secondary text-secondary-foreground font-mono text-[10px]">
          {count}
        </span>
      </div>

      {groups.map(([type, conns]) => {
        const isOpen = expanded.has(type);
        const shown = isOpen ? conns : conns.slice(0, VISIBLE_REFERENCES);
        const hidden = conns.length - shown.length;
        return (
          <div key={type} className="flex flex-col gap-[5px]">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.11em] text-muted-foreground">
              {type.replace(/_/g, " ").toLowerCase()}
            </span>
            {shown.map((c, i) => (
              <button
                key={`${c.node.id}-${i}`}
                onClick={() => onNavigate(c.node)}
                className="flex items-center gap-[9px] w-full -ml-[7px] px-[7px] py-[5px] rounded-md hover:bg-secondary"
              >
                <span className="w-3 shrink-0 font-mono text-[11px] text-faint">{arrow}</span>
                <span
                  className="w-1.5 h-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForLabel(c.node.label, theme) }}
                />
                <span className="flex-1 min-w-0 text-left font-mono text-[12px] text-foreground truncate">
                  {c.node.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[.06em] text-muted-foreground">
                  {c.node.label}
                </span>
              </button>
            ))}
            {hidden > 0 && (
              <button
                onClick={() => setExpanded((prev) => new Set(prev).add(type))}
                className="w-full h-7 rounded-[7px] border border-dashed border-border-strong text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
              >
                {t.detail.moreReferences(hidden.toLocaleString())}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
