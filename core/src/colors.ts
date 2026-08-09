// ============================================================================
// DATA-KIND COLOR LAW -- the root of the Observatory visual system
// (docs/design/observatory/README.md, "Data-kind hues").
//
// Colour comes from the PORT'S dataKind, never from the node's type. A wire
// is the colour of what travels down it; a plate's spine is the colour of
// its primary give port. Sixteen node types collapse to eleven learnable
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

export const DATA_KIND_STYLES: Record<DataKind, DataKindStyle> = {
  text: { hue: '#a595f2', stroke: 1.9 },
  person: { hue: '#e89b8f', stroke: 1.6, dash: '3 3' },
  place: { hue: '#c9a26b', stroke: 1.6, dash: '2 5' },
  thing: { hue: '#7fd4c1', stroke: 1.6, dash: '7 4' },
  cite: { hue: '#7fa3e8', stroke: 1.5, dash: '1 4' },
  claim: { hue: '#6fd39a', stroke: 1.8 },
  prop: { hue: '#52b8a8', stroke: 1.6, dash: '12 5' },
  plant: { hue: '#9fd18a', stroke: 1.6, dash: '9 3 2 3' },
  event: { hue: '#8f9ff0', stroke: 1.6, dash: '10 4 3 4' },
  thread: { hue: '#d08fd0', stroke: 2.2 },
  any: { hue: '#8085ad', stroke: 1.4, dash: '1 6' },
};

/** Base wire opacity; thread and heavier structural wires ride higher. */
export const WIRE_OPACITY = 0.68;
export const WIRE_OPACITY_HEAVY = 0.74;

/** State colours (attention/conflict/healthy/ink annotations). */
export const STATE_COLORS = {
  flag: '#f0c96a',
  conflict: '#f0685e',
  healthy: '#6fd39a',
  ink: '#84dcf2',
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
