import { useViewport } from '@xyflow/react';
import { getStroke } from 'perfect-freehand';
import { useCanvasStore } from '../store/canvasStore';

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke || !stroke.length) return '';

  const d = stroke.reduce(
    (acc, point, i, arr) => {
      const nextPoint = arr[(i + 1) % arr.length];
      if (!point || !nextPoint) return acc;
      const [x0, y0] = point;
      const [x1, y1] = nextPoint;
      if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined) return acc;
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...(stroke[0] || [0, 0]), 'Q'] as (string | number)[]
  );

  d.push('Z');
  return d.join(' ');
}

export function InkLayer() {
  const ink = useCanvasStore((state) => state.document.ink);
  const currentStroke = useCanvasStore((state) => state.currentStroke);
  const inkColor = useCanvasStore((state) => state.inkColor);
  const inkSize = useCanvasStore((state) => state.inkSize);
  const { x, y, zoom } = useViewport();

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0, // Above Starfield, below nodes
      }}
    >
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {(ink || []).map((stroke) => (
          <path
            key={stroke.id}
            d={getSvgPathFromStroke(
              getStroke(stroke.points, {
                size: stroke.size,
                thinning: 0.5,
                smoothing: 0.5,
                streamline: 0.5,
              })
            )}
            fill={stroke.color}
          />
        ))}
        {currentStroke && (
          <path
            d={getSvgPathFromStroke(
              getStroke(currentStroke.points, {
                size: inkSize,
                thinning: 0.5,
                smoothing: 0.5,
                streamline: 0.5,
              })
            )}
            fill={inkColor}
          />
        )}
      </g>
    </svg>
  );
}
