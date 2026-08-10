// ============================================================================
// DATA-KIND COLOR LAW -- the root of the Observatory visual system
// (docs/design/observatory/README.md, "Data-kind hues").
//
// Colour comes from the PORT'S dataKind, never from the node's type. A wire
// is the colour of what travels down it; a plate's spine is the colour of
// its primary give port. Seventeen node types collapse to eleven learnable
// hues, every one already a value in the registry.
//
// Values are literal and final per the handoff (high fidelity).
// ============================================================================

import type { DataKind } from './registry';

export type DataKindStyle = {
  /** The hue everything derives from. */
  hue: string;
  /** Wire stroke width. */
  stroke: number;
  /** SVG stroke-dasharray; undefined = solid. */
  dash?: string;
};

// User feedback 2026-08-10 ("colors still seem too similar, wires too"):
// the old hues clustered -- three teals, three blue-violets. This spread
// walks the wheel in ~25-45 degree steps so no two kinds neighbour:
// person 15 -> place 35 -> plant 80 -> claim 135 -> TEXT 166 (the teal
// the user picked as the app's lead colour) -> prop 195 -> cite 218 ->
// thing 262 (takes over the lavender text vacated) -> event 285 ->
// thread 310. Where hues sit closest, dash pattern and stroke weight
// carry the rest of the difference.
export const DATA_KIND_STYLES: Record<DataKind, DataKindStyle> = {
  text: { hue: '#2dd4bf', stroke: 1.9 },
  person: { hue: '#ff8e66', stroke: 1.6, dash: '3 3' },
  place: { hue: '#f5a742', stroke: 1.6, dash: '2 5' },
  thing: { hue: '#b19bff', stroke: 1.6, dash: '7 4' },
  cite: { hue: '#4d9bff', stroke: 1.5, dash: '1 4' },
  claim: { hue: '#46e06c', stroke: 1.8 },
  prop: { hue: '#33c5f0', stroke: 1.6, dash: '12 5' },
  plant: { hue: '#b5e84f', stroke: 1.6, dash: '9 3 2 3' },
  event: { hue: '#c46bff', stroke: 1.6, dash: '10 4 3 4' },
  thread: { hue: '#ff70dd', stroke: 2.2 },
  any: { hue: '#8e94c2', stroke: 1.4, dash: '1 6' },
};

/** Base wire opacity; thread and heavier structural wires ride higher. */
export const WIRE_OPACITY = 0.68;
export const WIRE_OPACITY_HEAVY = 0.74;

/** State colours (attention/conflict/healthy/ink annotations). */
export const STATE_COLORS = {
  flag: '#ffc94d',
  conflict: '#ff6a58',
  healthy: '#52dd93',
  ink: '#6fe0ff',
} as const;

/**
 * Resolve the style for a port. `any` ports adopt the colour of whatever
 * connects to them -- pass the partner's kind when a wire exists.
 */
export function dataKindStyle(kind: DataKind, partnerKind?: DataKind): DataKindStyle {
  if (kind === 'any' && partnerKind !== undefined && partnerKind !== 'any') {
    return DATA_KIND_STYLES[partnerKind];
  }
  return DATA_KIND_STYLES[kind];
}
