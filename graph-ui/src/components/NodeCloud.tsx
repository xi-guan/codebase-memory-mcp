import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphNode } from "../lib/types";
import type { Theme } from "../hooks/useTheme";
import {
  CANVAS_BACKGROUND,
  ENTRY_POINT_SIZE_SCALE,
  FOCUS_NODE,
  GL_ALPHA,
  MISSED_RING,
  NODE_STROKE,
  colorForLabel,
  colorForStatus,
  themed,
  themedAlpha,
} from "../lib/colors";
import { nodeGlowBoost } from "../lib/density";

interface NodeCloudProps {
  nodes: GraphNode[];
  highlightedIds: Set<number> | null;
  /* The one node the detail panel is showing — the only interaction colour
   * inside the canvas. */
  focusId?: number | null;
  theme: Theme;
  /* Dead-code view: hue comes from status instead of kind. */
  colorByStatus?: boolean;
  /* Hollow ring, no fill — the missed skeleton reads as "not really there". */
  hollow?: boolean;
  onHover: (node: GraphNode | null) => void;
  onClick: (node: GraphNode) => void;
  opacity?: number;
  /* Multiplier on the per-node glow boost. 1 = full boost (sparse graphs),
   * 0 = flat colors (dense graphs). Dark only — light has no bloom to feed. */
  boost?: number;
}

type Resolved = Required<Omit<NodeCloudProps, "focusId">> & { focusId: number | null };

/* Above this count instanced spheres stop paying off (vertex + matrix cost)
 * and the cloud switches to point sprites — one position per node. */
const POINT_MODE_THRESHOLD = 75000;
/* The light-mode rim is a second instanced mesh; past this it costs more than
 * it buys, and the darker light-mode fills already carry on a pale ground. */
const OUTLINE_MAX_NODES = 25000;

const FOCUS_SIZE_SCALE = 3.1;
const NEIGHBOUR_SIZE_SCALE = 2.0;
const OUTLINE_SCALE = 1.14;

/* Sphere tessellation by node count: nobody can tell a 12-segment sphere from
 * a 32-segment one at 25k nodes, but the GPU can. */
function sphereDetail(count: number): [number, number, number] {
  if (count <= 8000) return [1, 32, 24];
  if (count <= 25000) return [1, 16, 12];
  return [1, 10, 7];
}

function baseColor(node: GraphNode, theme: Theme, colorByStatus: boolean): string {
  return colorByStatus
    ? colorForStatus(node.status, theme)
    : colorForLabel(node.label, theme);
}

/* Size carries role, hue carries kind: an entry point is bigger, never a
 * different colour. */
function nodeScale(node: GraphNode, focus: boolean, neighbour: boolean): number {
  let s = node.size * 0.5;
  if (node.status === "entry") s *= ENTRY_POINT_SIZE_SCALE;
  if (focus) s *= FOCUS_SIZE_SCALE;
  else if (neighbour) s *= NEIGHBOUR_SIZE_SCALE;
  return s;
}

/* Dimming is a fade toward the canvas, not a darkening: multiplying by 0.16
 * fades on black but only deepens on a pale ground. */
function writeColor(
  node: GraphNode,
  r: Resolved,
  background: THREE.Color,
  temp: THREE.Color,
): [number, number, number] {
  const { highlightedIds, focusId, theme, colorByStatus, opacity, boost, hollow } = r;
  const hasHighlight = highlightedIds && highlightedIds.size > 0;
  const isFocus = focusId !== null && node.id === focusId;
  const dimmed = Boolean(hasHighlight && !highlightedIds.has(node.id) && !isFocus);

  if (hollow) temp.set(themed(MISSED_RING, theme));
  else if (isFocus) temp.set(themed(FOCUS_NODE, theme));
  else temp.set(baseColor(node, theme, colorByStatus));

  if (dimmed) {
    temp.lerp(background, 1 - themedAlpha(GL_ALPHA.dimmed, theme));
  } else if (theme === "dark" && !hollow) {
    /* Boost above 1.0 so bloom picks up the excess as glow corona; the amount
     * fades toward 1.0 as density rises so dense graphs stay legible. Light
     * has no bloom, so it stays at the literal palette value. */
    const full = nodeGlowBoost(temp.r, temp.g, temp.b);
    temp.multiplyScalar(1 + (full - 1) * boost);
  }

  /* fade toward the canvas, not toward black: a multiply darkens on a pale
   * ground, which reads as MORE salient in light mode, not less */
  temp.lerp(background, 1 - opacity);
  return [temp.r, temp.g, temp.b];
}

/* Round sprites for point mode (module-level lazy singletons). */
const sprites = new Map<"solid" | "ring", THREE.CanvasTexture>();
function getSprite(kind: "solid" | "ring"): THREE.CanvasTexture {
  const cached = sprites.get(kind);
  if (cached) return cached;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (kind === "ring") {
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = size * 0.12;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - ctx.lineWidth, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.9)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  sprites.set(kind, texture);
  return texture;
}

/* ── Point-sprite mode: very large clouds, and the hollow skeleton ─── */

function NodePoints(r: Resolved) {
  const { nodes, onHover, onClick, hollow, theme } = r;
  const { raycaster } = useThree();

  /* Widen the raycast threshold while points are on screen */
  useEffect(() => {
    const prev = raycaster.params.Points?.threshold ?? 1;
    raycaster.params.Points = { threshold: 3 };
    return () => {
      raycaster.params.Points = { threshold: prev };
    };
  }, [raycaster]);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 3);
    const temp = new THREE.Color();
    const background = new THREE.Color(themed(CANVAS_BACKGROUND, theme));
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      positions[i * 3] = n.x;
      positions[i * 3 + 1] = n.y;
      positions[i * 3 + 2] = n.z;
      const [cr, cg, cb] = writeColor(n, r, background, temp);
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
    }
    return { positions, colors };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [nodes, r.highlightedIds, r.focusId, r.opacity, r.boost, theme, r.colorByStatus, hollow]);

  return (
    <points
      /* Remount when the buffer size changes so stale attributes never linger */
      key={nodes.length}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (e.index !== undefined && e.index < nodes.length) {
          onHover(nodes[e.index]);
        }
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        if (e.index !== undefined && e.index < nodes.length) {
          onClick(nodes[e.index]);
        }
      }}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={hollow ? 7 : 4}
        sizeAttenuation
        map={getSprite(hollow ? "ring" : "solid")}
        alphaTest={0.35}
        transparent
        opacity={hollow ? themedAlpha(GL_ALPHA.missedRing, theme) : 1}
        toneMapped={false}
      />
    </points>
  );
}

/* ── Instanced-sphere mode (default) ──────────────────────────── */

function NodeSpheres(r: Resolved) {
  const { nodes, highlightedIds, focusId, theme, onHover, onClick } = r;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const outlineRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const detail = sphereDetail(nodes.length);
  const outlined = theme === "light" && nodes.length <= OUTLINE_MAX_NODES;

  /* Build instance color attributes — fade non-highlighted nodes */
  const colors = useMemo(() => {
    const arr = new Float32Array(nodes.length * 3);
    const background = new THREE.Color(themed(CANVAS_BACKGROUND, theme));
    for (let i = 0; i < nodes.length; i++) {
      const [cr, cg, cb] = writeColor(nodes[i], r, background, tempColor);
      arr[i * 3] = cr;
      arr[i * 3 + 1] = cg;
      arr[i * 3 + 2] = cb;
    }
    return arr;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [nodes, highlightedIds, focusId, tempColor, r.opacity, r.boost, theme, r.colorByStatus]);

  /* Node positions are static (the layout is server-computed), so instance
   * matrices only change with the node set, the highlight or the focus —
   * never rebuild them per frame. */
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const hasHighlight = highlightedIds && highlightedIds.size > 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const isFocus = focusId !== null && n.id === focusId;
      const isNeighbour = Boolean(hasHighlight && highlightedIds.has(n.id) && !isFocus);
      const s = nodeScale(n, isFocus, isNeighbour);
      tempObj.position.set(n.x, n.y, n.z);
      tempObj.scale.set(s, s, s);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);

      const outline = outlineRef.current;
      if (outline) {
        tempObj.scale.set(s * OUTLINE_SCALE, s * OUTLINE_SCALE, s * OUTLINE_SCALE);
        tempObj.updateMatrix();
        outline.setMatrixAt(i, tempObj.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (outlineRef.current) {
      outlineRef.current.instanceMatrix.needsUpdate = true;
      outlineRef.current.computeBoundingSphere();
    }
  }, [nodes, highlightedIds, focusId, tempObj, outlined]);

  return (
    <>
      {outlined && (
        /* Light only: a back-face rim so 1px dots survive on a pale ground. */
        <instancedMesh
          key={`outline-${nodes.length}`}
          ref={outlineRef}
          args={[undefined, undefined, nodes.length]}
          frustumCulled={false}
          raycast={() => null}
        >
          <sphereGeometry args={detail} />
          <meshBasicMaterial
            color={NODE_STROKE}
            transparent
            opacity={GL_ALPHA.nodeStroke}
            side={THREE.BackSide}
            depthWrite={false}
            toneMapped={false}
          />
        </instancedMesh>
      )}
      <instancedMesh
        /* Remount when the instance count changes so buffers are re-sized */
        key={nodes.length}
        ref={meshRef}
        args={[undefined, undefined, nodes.length]}
        frustumCulled={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined && e.instanceId < nodes.length) {
            onHover(nodes[e.instanceId]);
          }
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined && e.instanceId < nodes.length) {
            onClick(nodes[e.instanceId]);
          }
        }}
      >
        <sphereGeometry args={detail} />
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute
          attach="geometry-attributes-color"
          args={[colors, 3]}
        />
      </instancedMesh>
    </>
  );
}

export function NodeCloud({
  nodes,
  highlightedIds,
  focusId = null,
  theme,
  colorByStatus = false,
  hollow = false,
  onHover,
  onClick,
  opacity = 1.0,
  boost = 1.0,
}: NodeCloudProps) {
  const resolved: Resolved = {
    nodes,
    highlightedIds,
    focusId,
    theme,
    colorByStatus,
    hollow,
    onHover,
    onClick,
    opacity,
    boost,
  };

  if (hollow || nodes.length > POINT_MODE_THRESHOLD) {
    return <NodePoints {...resolved} />;
  }
  return <NodeSpheres {...resolved} />;
}
