// The relation filter bar (Observatory §6): one chip per data kind with
// live wires on the canvas, an "n of m shown" readout, and earned
// resolution -- wires outside the filter drop to a whisper. Appears only
// once there are enough wires for filtering to mean anything.

import { DATA_KIND_STYLES, getPort } from '@node-canvas/core';
import { useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';

/** Below this many live wires a filter is noise, not help. */
const MIN_WIRES = 4;

export function FilterBar() {
  const document = useCanvasStore((state) => state.document);
  const wireFilter = useCanvasStore((state) => state.wireFilter);
  const setWireFilter = useCanvasStore((state) => state.setWireFilter);

  const { kinds, total, shown } = useMemo(() => {
    const counts = new Map<string, number>();
    let liveTotal = 0;
    for (const wire of document.wires) {
      if (wire.status !== 'live') continue;
      const node = document.nodes.find((candidate) => candidate.id === wire.source);
      const kind = node ? getPort(node.type, wire.sourcePort)?.dataKind : undefined;
      if (!kind) continue;
      liveTotal++;
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    const visible =
      wireFilter === null
        ? liveTotal
        : [...counts.entries()]
            .filter(([kind]) => wireFilter.has(kind))
            .reduce((sum, [, count]) => sum + count, 0);
    return { kinds: [...counts.entries()].sort((a, b) => b[1] - a[1]), total: liveTotal, shown: visible };
  }, [document, wireFilter]);

  if (total < MIN_WIRES) return null;

  const toggle = (kind: string) => {
    const next = new Set(wireFilter ?? []);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setWireFilter(next.size === 0 ? null : next);
  };

  return (
    <div className="filter-bar" data-filter-bar>
      {kinds.map(([kind, count]) => {
        const hue = DATA_KIND_STYLES[kind as keyof typeof DATA_KIND_STYLES]?.hue ?? '#8e94c2';
        const active = wireFilter === null || wireFilter.has(kind);
        return (
          <button
            key={kind}
            className={`filter-chip ${active ? 'is-active' : ''}`}
            style={{ ['--chip-color' as string]: hue }}
            title={`${count} ${kind} wire${count === 1 ? '' : 's'} — click to filter`}
            onClick={() => toggle(kind)}
          >
            {kind} {count}
          </button>
        );
      })}
      <span className="filter-readout" data-filter-readout>
        {shown} of {total} shown
      </span>
      {wireFilter !== null && (
        <button className="filter-clear" onClick={() => setWireFilter(null)}>
          clear
        </button>
      )}
    </div>
  );
}
