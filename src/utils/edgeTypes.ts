// Relationship categories an edge can carry. Type sets the visual identity
// (color + dash + animation); the freeform label rides on top of whichever
// type is set.
//
// NEVER rename the keys -- they are stored in users' databases as
// edge.data.edgeType. Labels, colors, and styles are free to change.
//
// Each type gets a UNIQUE combination of hue + line style + motion so it is
// recognizable at a glance on the dark canvas:
//   solid + still   = plain statement (References)
//   dashed + still  = a relationship with distance in it (Conflicts, Mirrors)
//   solid + motion  = energy moving between the nodes (Leads To, Flows Into)
//   dashed + motion = something owed or promised (Depends On, Foreshadows)
export type EdgeAnimation = 'none' | 'pulse' | 'particles' | 'dash';

export type EdgeTypeDef = {
  label: string;
  color: string;
  dash?: string;
  animation?: EdgeAnimation;
};

export const EDGE_TYPES: Record<string, EdgeTypeDef> = {
  // ---------- Analytical / Logical ----------
  // The quiet default: muted gold, solid, still.
  references: { label: 'References', color: '#b08d4f', animation: 'none' },
  // Causality has direction and force: hot orange with particles flowing.
  causes: { label: 'Leads To', color: '#f97316', animation: 'particles' },
  // Steady reinforcement: green heartbeat.
  supports: { label: 'Supports', color: '#22c55e', animation: 'pulse' },
  // Friction: a red line that never quite connects.
  contradicts: { label: 'Conflicts With', color: '#ef4444', dash: '9 5', animation: 'none' },
  // A dependency chain: amber links marching toward what they need.
  requires: { label: 'Depends On', color: '#eab308', dash: '12 4', animation: 'dash' },

  // ---------- Narrative / Thematic ----------
  // A whisper of what's coming: faint purple dots, softly pulsing.
  foreshadows: { label: 'Foreshadows', color: '#a855f7', dash: '2 7', animation: 'pulse' },
  // A living spark between ideas: pink pulse.
  inspires: { label: 'Inspires', color: '#ec4899', animation: 'pulse' },
  // Movement from one section into the next: sky blue, particles in transit.
  transitions: { label: 'Flows Into', color: '#0ea5e9', animation: 'particles' },
  // Two halves of the same shape: teal, perfectly even dashes, still.
  parallels: { label: 'Mirrors', color: '#14b8a6', dash: '6 6', animation: 'none' },
  // The thread being tied off: silver-white dashes drawing closed.
  resolves: { label: 'Resolves', color: '#e2e8f0', animation: 'dash' },
};

export const DEFAULT_EDGE_TYPE = 'references';

export function edgeTypeOf(data: any): string {
  const t = data?.edgeType;
  return t && EDGE_TYPES[t] ? t : DEFAULT_EDGE_TYPE;
}
