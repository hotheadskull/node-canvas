// Readiness as a RING, never a coloured dot (Observatory spec §3): it can't
// compete with the data-kind hues, and the shape alone carries the stage --
// legible without colour vision. Values are literal from the handoff.

import type { Readiness } from '@node-canvas/core';

const RING = {
  seed: { stroke: '#4a4f76', width: 1.6, dash: '2 3' },
  developing: { stroke: '#4a4f76', width: 1.6 },
  ready: { stroke: '#52dd93', width: 1.8 },
  placed: { stroke: '#52dd93', width: 1.8 },
} as const;

export function ReadinessRing({
  stage,
  size = 14,
  onClick,
  title,
}: {
  stage: Readiness;
  size?: number;
  onClick?: () => void;
  title?: string;
}) {
  const ring = RING[stage];
  const svg = (
    <svg
      viewBox="0 0 26 26"
      width={size}
      height={size}
      className={`readiness-ring stage-${stage}`}
      role="img"
      aria-label={`Readiness: ${stage}`}
    >
      <circle
        cx="13"
        cy="13"
        r="8"
        fill={stage === 'placed' ? 'rgba(82,221,147,.18)' : 'none'}
        stroke={ring.stroke}
        strokeWidth={ring.width}
        strokeDasharray={'dash' in ring ? ring.dash : undefined}
      />
      {stage === 'developing' && (
        <path
          d="M13,5 A8,8 0 0 1 13,21"
          fill="none"
          stroke="#ffc94d"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
      {stage === 'placed' && (
        <path
          d="M9.5 13.2 L12 15.6 L16.8 10.6"
          fill="none"
          stroke="#52dd93"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
  if (!onClick) return svg;
  return (
    <button
      className="readiness-ring-button nodrag"
      onClick={onClick}
      title={title ?? `Readiness: ${stage} — click to advance`}
    >
      {svg}
    </button>
  );
}
