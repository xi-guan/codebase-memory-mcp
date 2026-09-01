import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { GraphNode } from "../lib/types";
import { colorForLabel } from "../lib/colors";
import { useTheme } from "../hooks/useTheme";
import { useUiMessages } from "../lib/i18n";

interface SidebarProps {
  nodes: GraphNode[];
  onSelectPath: (path: string, nodeIds: Set<number>, node?: GraphNode) => void;
  selectedPath: string | null;
}

interface DirNode {
  name: string;
  fullPath: string;
  children: Map<string, DirNode>;
  nodeIds: Set<number>;
  directNodes: GraphNode[];
}

function buildFileTree(nodes: GraphNode[]): DirNode {
  const root: DirNode = { name: "/", fullPath: "", children: new Map(), nodeIds: new Set(), directNodes: [] };
  for (const node of nodes) {
    if (!node.file_path) continue;
    const parts = node.file_path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!parts[i]) continue;
      let child = cur.children.get(parts[i]);
      if (!child) {
        const prefix = parts.slice(0, i + 1).join("/");
        child = { name: parts[i], fullPath: prefix, children: new Map(), nodeIds: new Set(), directNodes: [] };
        cur.children.set(parts[i], child);
      }
      cur = child;
    }
    cur.directNodes.push(node);
  }
  function collect(d: DirNode): Set<number> {
    const ids = new Set<number>();
    for (const n of d.directNodes) ids.add(n.id);
    for (const c of d.children.values()) for (const id of collect(c)) ids.add(id);
    d.nodeIds = ids;
    return ids;
  }
  collect(root);
  return root;
}

function flattenSingleChild(dir: DirNode): DirNode {
  const children = new Map<string, DirNode>();
  for (const [key, child] of dir.children) {
    let flat = flattenSingleChild(child);
    while (flat.children.size === 1 && flat.directNodes.length === 0) {
      const [sk, sc] = [...flat.children.entries()][0];
      flat = { ...sc, name: `${flat.name}/${sk}`, children: flattenSingleChild(sc).children };
    }
    children.set(key, flat);
  }
  return { ...dir, children };
}

function TreeItem({ dir, depth, onSelect, selectedPath }: {
  dir: DirNode; depth: number;
  onSelect: (path: string, ids: Set<number>, node?: GraphNode) => void;
  selectedPath: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [theme] = useTheme();
  const isSelected = selectedPath === dir.fullPath;
  const hasChildren = dir.children.size > 0 || dir.directNodes.length > 0;
  const sorted = useMemo(() => [...dir.children.values()].sort((a, b) => a.name.localeCompare(b.name)), [dir.children]);
  const sortedNodes = useMemo(() => [...dir.directNodes].sort((a, b) => a.name.localeCompare(b.name)), [dir.directNodes]);

  return (
    <div>
      <button
        onClick={() => { setExpanded(!expanded); onSelect(dir.fullPath, dir.nodeIds, undefined); }}
        className={`flex items-center gap-2 w-full h-7 px-2 rounded-md hover:bg-secondary ${
          isSelected ? "bg-secondary" : ""
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="w-[9px] shrink-0 text-faint">
          {hasChildren && (expanded ? <ChevronDown size={9} strokeWidth={1.5} /> : <ChevronRight size={9} strokeWidth={1.5} />)}
        </span>
        <span
          className={`flex-1 text-left font-mono text-[12px] truncate ${
            isSelected ? "text-primary" : "text-secondary-foreground"
          }`}
        >
          {dir.name}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{dir.nodeIds.size}</span>
      </button>
      {expanded && (
        <>
          {sorted.map((c) => <TreeItem key={c.fullPath} dir={c} depth={depth+1} onSelect={onSelect} selectedPath={selectedPath} />)}
          {sortedNodes.map((gn) => (
            <button
              key={gn.id}
              onClick={() => onSelect(dir.fullPath + "/" + gn.name, new Set([gn.id]), gn)}
              className="flex items-center gap-2 w-full h-7 px-2 rounded-md hover:bg-secondary"
              style={{ paddingLeft: `${(depth+1) * 12 + 8}px` }}
            >
              <span
                className="w-[6px] h-[6px] shrink-0 rounded-full"
                style={{ backgroundColor: colorForLabel(gn.label, theme) }}
              />
              <span className="flex-1 text-left font-mono text-[12px] text-secondary-foreground truncate">
                {gn.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[.06em] text-muted-foreground">
                {gn.label}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

export function Sidebar({ nodes, onSelectPath, selectedPath }: SidebarProps) {
  const t = useUiMessages();
  const [theme] = useTheme();
  const [search, setSearch] = useState("");
  const tree = useMemo(() => flattenSingleChild(buildFileTree(nodes)), [nodes]);

  const filtered = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    return nodes.filter((n) => n.name.toLowerCase().includes(q) || (n.file_path ?? "").toLowerCase().includes(q)).slice(0, 50);
  }, [nodes, search]);

  const topLevel = useMemo(() => [...tree.children.values()].sort((a, b) => a.name.localeCompare(b.name)), [tree.children]);

  return (
    <>
      <div className="px-4 pt-4 pb-2 flex flex-col gap-2.5 shrink-0">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
          {t.graph.folders}
        </span>
        <div className="flex items-center gap-[7px] h-[30px] px-[9px] bg-input border border-border rounded-[7px] focus-within:border-border-strong">
          <Search size={12} strokeWidth={2} className="shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.graph.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[12px] text-foreground"
          />
        </div>
      </div>

      <div className="px-2 pb-4">
        {filtered ? (
          filtered.length === 0 ? (
            <p className="text-[12px] text-muted-foreground px-2 py-6 text-center">
              {t.common.noMatches}
            </p>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => onSelectPath(n.file_path ?? "", new Set([n.id]), n)}
                className="flex items-center gap-2 w-full h-7 px-2 rounded-md hover:bg-secondary"
              >
                <span
                  className="w-[6px] h-[6px] shrink-0 rounded-full"
                  style={{ backgroundColor: colorForLabel(n.label, theme) }}
                />
                <span className="font-mono text-[12px] text-secondary-foreground truncate">
                  {n.name}
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground truncate max-w-[100px]">
                  {n.file_path}
                </span>
              </button>
            ))
          )
        ) : (
          topLevel.map((c) => <TreeItem key={c.fullPath} dir={c} depth={0} onSelect={onSelectPath} selectedPath={selectedPath} />)
        )}
      </div>
    </>
  );
}
