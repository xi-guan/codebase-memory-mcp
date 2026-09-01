import { useMemo } from "react";
import { Check } from "lucide-react";
import { colorForLabel, statusLegend } from "../lib/colors";
import { useTheme } from "../hooks/useTheme";
import { useUiMessages } from "../lib/i18n";
import type { GraphData } from "../lib/types";

interface FilterPanelProps {
  data: GraphData;
  enabledLabels: Set<string>;
  enabledEdgeTypes: Set<string>;
  showLabels: boolean;
  onToggleLabel: (label: string) => void;
  onToggleEdgeType: (type: string) => void;
  onToggleShowLabels: () => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  /* Dead-code view */
  deadCodeView: boolean;
  showOnlyDead: boolean;
  hideEntryPoints: boolean;
  hideTests: boolean;
  onToggleDeadCodeView: () => void;
  onToggleShowOnlyDead: () => void;
  onToggleHideEntryPoints: () => void;
  onToggleHideTests: () => void;
  /* Missed skeleton (#963): white satellite of not-fully-indexed files */
  missedView: boolean;
  missedCount: number;
  onToggleMissedView: () => void;
}

/* 10px mono uppercase — the label style every section header shares. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
      {children}
    </span>
  );
}

function CheckRow({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-[9px] cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only peer"
      />
      <span
        className={`w-[15px] h-[15px] shrink-0 rounded-[4px] flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${
          checked ? "bg-primary" : "border border-border-strong bg-input"
        }`}
      >
        {checked && (
          <Check size={10} strokeWidth={3.4} className="text-primary-foreground" />
        )}
      </span>
      <span className={`text-[12px] ${checked ? "text-foreground" : "text-secondary-foreground"}`}>
        {label}
      </span>
    </label>
  );
}

export function FilterPanel({
  data,
  enabledLabels,
  enabledEdgeTypes,
  showLabels,
  onToggleLabel,
  onToggleEdgeType,
  onToggleShowLabels,
  onEnableAll,
  onDisableAll,
  deadCodeView,
  showOnlyDead,
  hideEntryPoints,
  hideTests,
  onToggleDeadCodeView,
  onToggleShowOnlyDead,
  onToggleHideEntryPoints,
  onToggleHideTests,
  missedView,
  missedCount,
  onToggleMissedView,
}: FilterPanelProps) {
  const t = useUiMessages();
  const [theme] = useTheme();
  const { labelCounts, edgeTypeCounts, statusCounts } = useMemo(() => {
    const lc = new Map<string, number>();
    for (const n of data.nodes) lc.set(n.label, (lc.get(n.label) ?? 0) + 1);
    const ec = new Map<string, number>();
    for (const e of data.edges) ec.set(e.type, (ec.get(e.type) ?? 0) + 1);
    const sc = new Map<string, number>();
    for (const n of data.nodes)
      if (n.status) sc.set(n.status, (sc.get(n.status) ?? 0) + 1);
    return {
      labelCounts: [...lc.entries()].sort((a, b) => b[1] - a[1]),
      edgeTypeCounts: [...ec.entries()].sort((a, b) => b[1] - a[1]),
      statusCounts: sc,
    };
  }, [data]);

  const deadCount = statusCounts.get("dead") ?? 0;

  return (
    <>
      {/* Node types — a 2-column grid, never a wrap: a wrapped last row used
          to get clipped by the section's height. */}
      <div className="p-4 pb-[18px] flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <SectionLabel>{t.graph.nodeTypes}</SectionLabel>
          <span className="flex items-center gap-[7px] text-[11px]">
            <button onClick={onEnableAll} className="text-primary">
              {t.common.all}
            </button>
            <span className="text-faint">/</span>
            <button onClick={onDisableAll} className="text-muted-foreground hover:text-foreground">
              {t.common.none}
            </button>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-[5px]">
          {labelCounts.map(([label, count]) => {
            const on = enabledLabels.has(label);
            return (
              <button
                key={label}
                onClick={() => onToggleLabel(label)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 h-[26px] px-2 min-w-0 rounded-md border bg-card ${
                  on ? "border-border hover:border-border-strong" : "border-border opacity-45"
                }`}
              >
                <span
                  className="w-[7px] h-[7px] shrink-0 rounded-full"
                  style={{
                    backgroundColor: on
                      ? colorForLabel(label, theme)
                      : "var(--cbm-faint)",
                  }}
                />
                <span className="flex-1 text-left text-[11px] text-foreground truncate">
                  {label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-border shrink-0" />

      {/* Relationships — not in the redesign's sidebar list, but dropping it
          would remove edge-type filtering entirely; same chip system. */}
      {edgeTypeCounts.length > 0 && (
        <>
          <div className="p-4 flex flex-col gap-4 shrink-0">
            <SectionLabel>Relationships</SectionLabel>
            <div className="grid grid-cols-2 gap-[5px]">
              {edgeTypeCounts.map(([type, count]) => {
                const on = enabledEdgeTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => onToggleEdgeType(type)}
                    aria-pressed={on}
                    className={`flex items-center gap-1.5 h-[26px] px-2 min-w-0 rounded-md border border-border bg-card ${
                      on ? "hover:border-border-strong" : "opacity-45"
                    }`}
                  >
                    <span className="flex-1 text-left text-[11px] text-foreground truncate">
                      {type.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {count.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-px bg-border shrink-0" />
        </>
      )}

      {/* Missed skeleton (#963): files the indexer could not fully cover,
          shown as a hollow satellite beside the code galaxy. */}
      <div className="p-4 flex flex-col gap-[11px] shrink-0">
        <div className="flex items-baseline justify-between">
          <SectionLabel>{t.graph.missedFiles}</SectionLabel>
          {missedCount > 0 && (
            <span className="font-mono text-[11px] text-secondary-foreground">
              {missedCount.toLocaleString()}
            </span>
          )}
        </div>
        <CheckRow
          checked={missedView}
          onToggle={onToggleMissedView}
          label={t.graph.showMissedSkeleton}
        />
        <p className="ml-6 text-[11px] leading-[1.5] text-muted-foreground [text-wrap:pretty]">
          {missedCount > 0 ? t.graph.missedExplainer : t.graph.missedNone}
        </p>
      </div>

      <div className="h-px bg-border shrink-0" />

      <div className="p-4 flex flex-col gap-[11px] shrink-0">
        <div className="flex items-baseline justify-between">
          <SectionLabel>{t.graph.deadCode}</SectionLabel>
          <span className="font-mono text-[11px] text-destructive">
            {t.graph.deadCount(deadCount.toLocaleString())}
          </span>
        </div>

        <CheckRow
          checked={deadCodeView}
          onToggle={onToggleDeadCodeView}
          label={t.graph.colorByStatus}
        />
        <CheckRow
          checked={showOnlyDead}
          onToggle={onToggleShowOnlyDead}
          label={t.graph.showOnlyDead}
        />
        <CheckRow
          checked={hideEntryPoints}
          onToggle={onToggleHideEntryPoints}
          label={t.graph.hideEntryPoints}
        />
        <CheckRow checked={hideTests} onToggle={onToggleHideTests} label={t.graph.hideTests} />

        {/* Only meaningful while the graph is coloured by status. */}
        {deadCodeView && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
            {statusLegend(theme).map((s) => (
              <span
                key={s.status}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="w-[6px] h-[6px] rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
            ))}
          </div>
        )}

        <div className="pt-1">
          <CheckRow
            checked={showLabels}
            onToggle={onToggleShowLabels}
            label={t.graph.showLabels}
          />
        </div>
      </div>

      <div className="h-px bg-border shrink-0" />
    </>
  );
}
