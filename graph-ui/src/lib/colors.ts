/* Node colour is a THEME decision, not a server one.
 *
 * Hue tells you what KIND of symbol a node is; size and outline tell you what
 * role it plays; the accent tells you where you are. Light is not a tint of
 * dark — fills darken so 1px dots survive on a pale ground. These are three.js
 * material values and inline-style dots, never CSS custom properties. */

import type { Theme } from "../hooks/useTheme";

interface ThemedColor {
  dark: string;
  light: string;
}

const pick = (c: ThemedColor, theme: Theme) =>
  theme === "dark" ? c.dark : c.light;

/* The six sanctioned node hues. Variable is the bulk of any graph, so it is
 * neutral and recedes; every unrecognised label falls back to it. */
const KIND_COLORS = {
  Variable: { dark: "#9FB3B8", light: "#5A6E72" },
  Method: { dark: "#35C6D8", light: "#0E7E92" },
  Function: { dark: "#2FB98C", light: "#0F7A5C" },
  Class: { dark: "#A97BF0", light: "#7B45C4" },
  Macro: { dark: "#E27BB0", light: "#A83C79" },
  File: { dark: "#5B8FE8", light: "#3E4FB0" },
} as const;

type KindName = keyof typeof KIND_COLORS;

/* Labels the backend emits, folded onto the six hues. Structural containers
 * all read as "File"; anything unlisted stays neutral. */
const LABEL_KIND: Record<string, KindName> = {
  Variable: "Variable",
  Method: "Method",
  Function: "Function",
  Class: "Class",
  Interface: "Class",
  Struct: "Class",
  Enum: "Class",
  Macro: "Macro",
  File: "File",
  Folder: "File",
  Package: "File",
  Module: "File",
  Project: "File",
};

export function colorForLabel(label: string, theme: Theme): string {
  return pick(KIND_COLORS[LABEL_KIND[label] ?? "Variable"], theme);
}

/* Dead-code status → colour (matches layout3d.c status strings).
 *   dead     zero callers + zero usages, not entry/test/exported
 *   single   exactly one caller
 *   entry    entry points / routes
 *   test     test code
 *   normal   healthy (>=2 callers)
 *   exported/structural → neutral (not dead-code candidates)
 * Only ever shown with "colour by status" on, so it may borrow the kind hues. */
const STATUS_COLORS: Record<string, ThemedColor> = {
  dead: { dark: "#F0736B", light: "#B32424" },
  single: KIND_COLORS.Macro,
  entry: KIND_COLORS.File,
  test: KIND_COLORS.Class,
  normal: KIND_COLORS.Function,
  exported: KIND_COLORS.Variable,
  structural: KIND_COLORS.Variable,
};

export function colorForStatus(status: string | undefined, theme: Theme): string {
  return pick(STATUS_COLORS[status ?? ""] ?? KIND_COLORS.Variable, theme);
}

export function statusLegend(theme: Theme): { status: string; label: string; color: string }[] {
  return [
    { status: "dead", label: "Dead (0 callers)" },
    { status: "single", label: "One caller" },
    { status: "entry", label: "Entry / route" },
    { status: "test", label: "Test" },
    { status: "normal", label: "Normal" },
  ].map((s) => ({ ...s, color: colorForStatus(s.status, theme) }));
}

/* ── Canvas-only values (three.js, not CSS) ──────────────────── */

export const CANVAS_BACKGROUND: ThemedColor = { dark: "#06090B", light: "#EDF1F2" };
/* The one interaction colour inside the canvas. */
export const FOCUS_NODE: ThemedColor = { dark: "#FFC46B", light: "#1A5FB4" };
/* Away from focus takes the accent hue, toward focus the counter-hue. */
export const EDGE_IDLE: ThemedColor = { dark: "#6E8A93", light: "#47606A" };
export const EDGE_OUTGOING: ThemedColor = { dark: "#E9A63C", light: "#1A5FB4" };
export const EDGE_INCOMING: ThemedColor = { dark: "#35C6D8", light: "#B03C78" };
/* Hollow, no fill — it reads as "not really there". */
export const MISSED_RING: ThemedColor = { dark: "#E6EFF0", light: "#0C1417" };
/* Light only: keeps 1px dots visible on a pale ground. */
export const NODE_STROKE = "#0C1417";

export const GL_ALPHA = {
  edgeIdle: { dark: 0.16, light: 0.13 },
  edgeOutgoing: { dark: 0.8, light: 0.9 },
  edgeIncoming: { dark: 0.75, light: 0.85 },
  missedRing: { dark: 0.75, light: 0.55 },
  dimmed: { dark: 0.16, light: 0.17 },
  nodeStroke: 0.35,
} as const;

/* Role is size, never hue. */
export const ENTRY_POINT_SIZE_SCALE = 1.8;

export function themed(color: ThemedColor, theme: Theme): string {
  return pick(color, theme);
}

export function themedAlpha(
  alpha: { dark: number; light: number },
  theme: Theme,
): number {
  return theme === "dark" ? alpha.dark : alpha.light;
}
