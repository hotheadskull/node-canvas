// Node-type legend, bottom-right (I6), rendered from the registry so it can
// never drift from the real node colors.

import { coreMenuTypes } from '@node-canvas/core';

export function Legend() {
  return (
    <div className="legend" aria-label="Node type legend">
      {coreMenuTypes().map((def) => (
        <span key={def.type} className="legend-item">
          <span className="legend-dot" style={{ background: def.accent }} />
          {def.labels.universal}
        </span>
      ))}
    </div>
  );
}
