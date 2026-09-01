import { Html } from "@react-three/drei";
import type { GraphNode } from "../lib/types";
import { colorForLabel, colorForStatus } from "../lib/colors";
import { useTheme } from "../hooks/useTheme";

interface NodeTooltipProps {
  node: GraphNode;
}

function lineRange(node: GraphNode): string | null {
  if (!node.start_line) return null;
  if (node.end_line && node.end_line !== node.start_line)
    return `L${node.start_line}-${node.end_line}`;
  return `L${node.start_line}`;
}

export function NodeTooltip({ node }: NodeTooltipProps) {
  const [theme] = useTheme();

  return (
    <Html
      position={[node.x, node.y + node.size * 0.7, node.z]}
      center
      style={{ pointerEvents: "none" }}
    >
      <div className="px-3 py-2 max-w-[350px] whitespace-nowrap rounded-lg bg-popover border border-border-strong shadow-[0_18px_44px_var(--cbm-shade)]">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 shrink-0 rounded-full"
            style={{ backgroundColor: colorForLabel(node.label, theme) }}
          />
          <span className="text-[12px] font-semibold text-foreground truncate">
            {node.name}
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[.06em] text-muted-foreground">
            {node.label}
          </span>
        </div>
        {node.file_path && (
          <p className="m-0 mt-1 font-mono text-[11px] text-muted-foreground truncate">
            {node.file_path}
            {lineRange(node) && <span className="text-primary"> · {lineRange(node)}</span>}
          </p>
        )}
        {node.status && node.status !== "structural" && (
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
            <span
              className="w-1.5 h-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorForStatus(node.status, theme) }}
            />
            <span>{node.status}</span>
            {node.in_calls !== undefined && (
              <span>
                · {node.in_calls} caller{node.in_calls === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
      </div>
    </Html>
  );
}
