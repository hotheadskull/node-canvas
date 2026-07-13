/**
 * Stable entity id. Every node, edge, wire, port, and assembly gets one at
 * creation and keeps it forever -- identity never derives from array position
 * (CRDT-compatibility constraint, docs/invariants/INVARIANTS.md I10).
 */
export type EntityId = string;

let counter = 0;

/**
 * Generate a unique entity id. Uses crypto.randomUUID when available (app
 * runtime) and a deterministic fallback for test environments that seed it.
 */
export function createId(prefix: string): EntityId {
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(counter++).toString(36)}`;
  return `${prefix}_${unique}`;
}
