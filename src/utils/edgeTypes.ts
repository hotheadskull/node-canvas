// Relationship categories an edge can carry. Type sets the visual identity
// (color + dash); the freeform label rides on top of whichever type is set.
export type EdgeTypeDef = {
  label: string;
  color: string;
  // SVG stroke-dasharray; undefined = solid line
  dash?: string;
};

export const EDGE_TYPES: Record<string, EdgeTypeDef> = {
  references: { label: 'References', color: '#8c734b' },
  causes: { label: 'Causes', color: '#fb923c' },
  supports: { label: 'Supports', color: '#34d399' },
  contradicts: { label: 'Contradicts', color: '#ef4444', dash: '8 5' },
  foreshadows: { label: 'Foreshadows', color: '#a78bfa', dash: '2 6' },
};

export const DEFAULT_EDGE_TYPE = 'references';

export function edgeTypeOf(data: any): string {
  const t = data?.edgeType;
  return t && EDGE_TYPES[t] ? t : DEFAULT_EDGE_TYPE;
}
