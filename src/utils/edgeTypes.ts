// Relationship categories an edge can carry. Type sets the visual identity
// (color + dash); the freeform label rides on top of whichever type is set.
export type EdgeAnimation = 'none' | 'pulse' | 'particles' | 'dash';

export type EdgeTypeDef = {
  label: string;
  color: string;
  dash?: string;
  animation?: EdgeAnimation;
};

export const EDGE_TYPES: Record<string, EdgeTypeDef> = {
  // Analytical / Logical
  references: { label: 'References', color: '#8c734b', animation: 'none' }, // Art Deco Gold
  causes: { label: 'Causes', color: '#ff5722', animation: 'particles' }, // Vermillion (Bright Orange/Red)
  supports: { label: 'Supports', color: '#4caf50', animation: 'pulse' }, // Vibrant Green
  contradicts: { label: 'Contradicts', color: '#f44336', dash: '8 5', animation: 'none' }, // Bright Red
  requires: { label: 'Requires', color: '#ffeb3b', animation: 'dash' }, // Bright Yellow
  
  // Narrative / Thematic
  foreshadows: { label: 'Foreshadows', color: '#9c27b0', dash: '2 6', animation: 'pulse' }, // Deep Purple
  inspires: { label: 'Inspires', color: '#e91e63', animation: 'pulse' }, // Hot Pink
  transitions: { label: 'Transitions', color: '#03a9f4', animation: 'particles' }, // Light Blue
  parallels: { label: 'Parallels', color: '#00bcd4', dash: '4 4', animation: 'none' }, // Cyan
  resolves: { label: 'Resolves', color: '#8bc34a', animation: 'pulse' }, // Lime Green
};

export const DEFAULT_EDGE_TYPE = 'references';

export function edgeTypeOf(data: any): string {
  const t = data?.edgeType;
  return t && EDGE_TYPES[t] ? t : DEFAULT_EDGE_TYPE;
}
