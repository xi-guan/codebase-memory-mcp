import { useMemo } from "react";
import * as THREE from "three";
import type { GraphNode, GraphEdge } from "../lib/types";
import type { Theme } from "../hooks/useTheme";
import {
  EDGE_IDLE,
  EDGE_INCOMING,
  EDGE_OUTGOING,
  GL_ALPHA,
  themed,
  themedAlpha,
} from "../lib/colors";
import { edgeIntensityScale } from "../lib/density";

interface EdgeLinesProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedIds: Set<number> | null;
  /* Direction is read against this node: away from it takes the accent hue,
   * toward it the counter-hue. */
  focusId?: number | null;
  theme: Theme;
  opacity?: number;
  /* User edge-brightness multiplier (see DisplaySettings), layered on top of
   * the automatic density scale. */
  brightness?: number;
  /* When set, edge.target is looked up in this array instead of `nodes`.
   * Used for cross-galaxy edges where source lives in the primary graph
   * and target lives in a linked project's offset-adjusted nodes. */
  targetNodes?: GraphNode[];
}

export function EdgeLines({
  nodes,
  edges,
  highlightedIds,
  focusId = null,
  theme,
  opacity = 1.0,
  brightness = 1.0,
  targetNodes,
}: EdgeLinesProps) {
  const dark = theme === "dark";

  const geometry = useMemo(() => {
    /* Shrink per-edge glow as the edge count grows so the additively-blended
     * center doesn't saturate to white; the user multiplier rides on top. */
    const densityScale = edgeIntensityScale(edges.length) * brightness;
    const srcMap = new Map<number, number>();
    for (let i = 0; i < nodes.length; i++) {
      srcMap.set(nodes[i].id, i);
    }
    const tgtArr = targetNodes ?? nodes;
    const tgtMap = targetNodes ? new Map<number, number>() : srcMap;
    if (targetNodes) {
      for (let i = 0; i < targetNodes.length; i++) {
        tgtMap.set(targetNodes[i].id, i);
      }
    }

    const idle = new THREE.Color(themed(EDGE_IDLE, theme));
    const outgoing = new THREE.Color(themed(EDGE_OUTGOING, theme));
    const incoming = new THREE.Color(themed(EDGE_INCOMING, theme));
    const idleAlpha = themedAlpha(GL_ALPHA.edgeIdle, theme);
    const outAlpha = themedAlpha(GL_ALPHA.edgeOutgoing, theme);
    const inAlpha = themedAlpha(GL_ALPHA.edgeIncoming, theme);
    const dimAlpha = themedAlpha(GL_ALPHA.dimmed, theme);

    const hasHighlight = highlightedIds && highlightedIds.size > 0;
    const positions = new Float32Array(edges.length * 6);
    /* Four components so the alpha rides per-vertex: light blends normally
     * (additive would wash a pale ground to white) and needs real alpha. */
    const colors = new Float32Array(edges.length * 8);
    let validCount = 0;

    for (const edge of edges) {
      const si = srcMap.get(edge.source);
      const ti = tgtMap.get(edge.target);
      if (si === undefined || ti === undefined) continue;

      const s = nodes[si];
      const t = tgtArr[ti];

      const sHL = !hasHighlight || highlightedIds.has(s.id);
      const tHL = !hasHighlight || highlightedIds.has(t.id);
      if (hasHighlight && !sHL && !tHL) continue;

      let color = idle;
      let alpha = idleAlpha * densityScale;
      if (focusId !== null && edge.source === focusId) {
        color = outgoing;
        alpha = outAlpha;
      } else if (focusId !== null && edge.target === focusId) {
        color = incoming;
        alpha = inAlpha;
      } else if (hasHighlight) {
        /* Neither end is the focus: part of the dimmed rest. */
        alpha = sHL && tHL ? idleAlpha : idleAlpha * dimAlpha * densityScale;
      }

      const p = validCount * 6;
      positions[p] = s.x;
      positions[p + 1] = s.y;
      positions[p + 2] = s.z;
      positions[p + 3] = t.x;
      positions[p + 4] = t.y;
      positions[p + 5] = t.z;

      /* Dark blends additively, so the intensity rides in the RGB and the
       * alpha stays at 1; light carries it in the alpha instead. */
      const r = dark ? color.r * alpha : color.r;
      const g = dark ? color.g * alpha : color.g;
      const b = dark ? color.b * alpha : color.b;
      const a = dark ? 1 : alpha;
      const c = validCount * 8;
      colors[c] = r; colors[c + 1] = g; colors[c + 2] = b; colors[c + 3] = a;
      colors[c + 4] = r; colors[c + 5] = g; colors[c + 6] = b; colors[c + 7] = a;
      validCount++;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions.slice(0, validCount * 6), 3),
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(colors.slice(0, validCount * 8), 4),
    );
    return geo;
  }, [nodes, edges, highlightedIds, focusId, targetNodes, brightness, theme, dark]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={opacity}
        blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}
