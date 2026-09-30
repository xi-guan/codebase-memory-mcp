import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import type { ProcessInfo } from "../lib/types";
import { useUiMessages } from "../lib/i18n";

/* ── Meter ──────────────────────────────────────────────── */

function Meter({ label, value, max, unit, decimals = 1 }: {
  label: string; value: number; max: number; unit: string; decimals?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="bg-card px-4 pt-3.5 pb-[15px] flex flex-col gap-[9px]">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
        {label}
      </span>
      <span className="flex items-baseline gap-[5px]">
        <span className="font-mono text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
          {value.toFixed(decimals)}
        </span>
        {unit && (
          <span className="font-mono text-[11px] text-muted-foreground">{unit}</span>
        )}
      </span>
      <span className="block h-[3px] rounded-sm bg-secondary overflow-hidden">
        <span
          className="block h-full rounded-sm transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct > 80 ? "var(--cbm-destructive)" : "var(--cbm-ok)",
          }}
        />
      </span>
    </div>
  );
}

/* ── Log viewer ─────────────────────────────────────────── */

function LogViewer() {
  const t = useUiMessages();
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/logs?lines=200");
        const data = await res.json();
        setLines(data.lines ?? []);
      } catch { /* ignore */ }
    }, 2000);
    /* Initial fetch */
    fetch("/api/logs?lines=200").then(r => r.json()).then(d => setLines(d.lines ?? [])).catch(() => {});
    return () => clearInterval(poll);
  }, []);

  return (
    <div className="rounded-[10px] border border-border overflow-hidden">
      <div className="flex items-baseline gap-2 px-4 py-2.5 bg-card border-b border-border">
        <span className="text-[13px] font-semibold">{t.control.processLogs}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {t.control.logLines(lines.length.toLocaleString())}
        </span>
      </div>
      <div className="h-[400px] overflow-y-auto bg-input">
        <div className="p-3 font-mono text-[11px] leading-[1.6]">
          {lines.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t.control.noLogs}</p>
          ) : (
            lines.map((line, i) => {
              const isErr = line.includes("level=error");
              const isWarn = line.includes("level=warn");
              return (
                <div
                  key={i}
                  className={
                    isErr
                      ? "text-destructive"
                      : isWarn
                        ? "text-primary"
                        : "text-muted-foreground"
                  }
                >
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Control Tab ───────────────────────────────────── */

const PROCESS_GRID = "grid-cols-[136px_68px_76px_92px_1fr]";

export function ControlTab() {
  const t = useUiMessages();
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [selfMetrics, setSelfMetrics] = useState({ rss_mb: 0, user_cpu: 0, sys_cpu: 0 });

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch("/api/processes");
      const data = await res.json();
      setProcesses(data.processes ?? []);
      setSelfMetrics({
        rss_mb: data.self_rss_mb ?? 0,
        user_cpu: data.self_user_cpu_s ?? 0,
        sys_cpu: data.self_sys_cpu_s ?? 0,
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 3000);
    return () => clearInterval(interval);
  }, [fetchProcesses]);

  /* Aggregates */
  const totalCpu = processes.reduce((s, p) => s + p.cpu, 0);
  const totalRam = processes.reduce((s, p) => s + p.rss_mb, 0);
  const self = processes.find((p) => p.is_self);

  const columns = [
    { label: t.control.pid, align: "" },
    { label: "CPU", align: "text-right pr-[18px]" },
    { label: "RAM", align: "text-right pr-[18px]" },
    { label: t.control.uptime, align: "text-right pr-[18px]" },
    { label: t.control.command, align: "" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1120px] mx-auto px-10 pt-[30px] pb-11 flex flex-col gap-7">
        <div className="flex items-end justify-between gap-6 pb-3.5 border-b border-border">
          <div className="flex flex-col gap-[7px]">
            <h1 className="m-0 text-[21px] font-bold tracking-[-0.032em]">
              {t.control.panel}
            </h1>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${self ? "bg-ok" : "bg-faint"}`} />
              {self
                ? t.control.status(String(self.pid), self.elapsed)
                : t.control.stopped}
            </div>
          </div>
          <button
            onClick={fetchProcesses}
            className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] border border-border hover:border-border-strong text-[12px] text-secondary-foreground hover:text-foreground"
          >
            <RefreshCw size={12} strokeWidth={2} />
            {t.common.refresh}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-px bg-border border border-border rounded-[10px] overflow-hidden">
          <Meter label={t.control.totalCpu} value={totalCpu} max={100 * processes.length || 100} unit="%" />
          <Meter label={t.control.totalRam} value={totalRam} max={4096} unit="MB" />
          <Meter label={t.control.processes} value={processes.length} max={10} unit="" decimals={0} />
          <Meter label={t.control.selfRam} value={selfMetrics.rss_mb} max={2048} unit="MB" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-baseline gap-[9px] pb-[11px]">
            <span className="text-[13px] font-semibold">{t.control.activeProcesses}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {processes.length}
            </span>
          </div>

          {processes.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-8">
              {t.control.noProcesses}
            </p>
          ) : (
            <>
              <div className={`grid ${PROCESS_GRID} px-2.5 pb-[7px] border-b border-border`}>
                {columns.map((c) => (
                  <span
                    key={c.label}
                    className={`font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground ${c.align}`}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
              {processes.map((p) => (
                <div
                  key={p.pid}
                  className={`grid ${PROCESS_GRID} items-center h-[34px] px-2.5 border-b border-border hover:bg-card`}
                >
                  <span className="flex items-center gap-2 font-mono text-[12px] whitespace-nowrap">
                    <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-ok" />
                    <span className="shrink-0 whitespace-nowrap">PID {p.pid}</span>
                    {p.is_self && (
                      <span className="h-[15px] px-1 inline-flex items-center rounded-[3px] bg-primary text-primary-foreground text-[9px] font-bold tracking-[.08em]">
                        {t.control.thisProcess}
                      </span>
                    )}
                  </span>
                  {/* CPU carries the only hierarchy cue in the table. */}
                  <span
                    className={`font-mono text-[12px] text-right pr-[18px] tabular-nums ${
                      p.cpu > 2 ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {p.cpu.toFixed(1)}%
                  </span>
                  <span className="font-mono text-[12px] text-right pr-[18px] tabular-nums text-secondary-foreground">
                    {p.rss_mb.toFixed(0)} MB
                  </span>
                  <span className="font-mono text-[12px] text-right pr-[18px] tabular-nums text-muted-foreground">
                    {p.elapsed}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate">
                    {p.command}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <LogViewer />
      </div>
    </div>
  );
}
