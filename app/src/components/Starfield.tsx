// Parallax starfield ported from /legacy (I6: dark cosmic starfield).
// Three procedurally generated star layers move at different speeds with the
// viewport; the cross grid fades out as the user zooms away.

import { Background, BackgroundVariant, useViewport } from '@xyflow/react';
import { useMemo } from 'react';

// Glow is baked into the SVG as a soft halo circle behind each star instead
// of a CSS drop-shadow filter on the whole layer -- filtering a full-viewport
// repeating background rasterizes brutally (renderer hangs on capture and
// stutters on weaker GPUs).
function generateStarSVG(density: number, maxSize: number, color: string, glow = false): string {
  let circles = '';
  const size = 2048;
  const addCircle = (cx: number, cy: number, r: number, opacity: string) => {
    if (glow) {
      circles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 3).toFixed(2)}" fill="${color}" opacity="${(+opacity * 0.18).toFixed(2)}"/>`;
    }
    circles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${opacity}"/>`;
  };
  for (let i = 0; i < density; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = Math.random() * maxSize + 0.8;
    const opacity = (Math.random() * 0.4 + 0.6).toFixed(2);
    addCircle(cx, cy, r, opacity);
    // seamless edge wrapping: a star touching an edge is cloned opposite
    if (cx - r < 0) addCircle(cx + size, cy, r, opacity);
    if (cx + r > size) addCircle(cx - size, cy, r, opacity);
    if (cy - r < 0) addCircle(cx, cy + size, r, opacity);
    if (cy + r > size) addCircle(cx, cy - size, r, opacity);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${circles}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function starLayer(image: string, x: number, y: number, zoom: number, speed: number) {
  return {
    position: 'absolute' as const,
    inset: 0,
    pointerEvents: 'none' as const,
    backgroundImage: `url('${image}')`,
    backgroundRepeat: 'repeat',
    backgroundPosition: `${x * speed}px ${y * speed}px`,
    backgroundSize: `${2048 * zoom}px ${2048 * zoom}px`,
  };
}

export function Starfield() {
  const { x, y, zoom } = useViewport();
  const farStars = useMemo(() => generateStarSVG(400, 1.0, '#ffffff'), []);
  const midStars = useMemo(() => generateStarSVG(200, 1.5, '#ffd999', true), []);
  const nearStars = useMemo(() => generateStarSVG(75, 2.0, '#b8d4ff', true), []);

  return (
    <>
      <div className="starfield-void" />
      <div style={{ ...starLayer(farStars, x, y, zoom, 0.2), zIndex: -3 }} />
      <div style={{ ...starLayer(midStars, x, y, zoom, 0.5), zIndex: -2 }} />
      <div style={{ ...starLayer(nearStars, x, y, zoom, 1.0), zIndex: -1 }} />
      <div
        className="shooting-star-field"
        style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        <div className="shooting-star-strip">
          <div className="shooting-star star-1" />
          <div className="shooting-star star-2" />
          <div className="shooting-star star-3" />
          <div className="shooting-star star-4" />
          <div className="shooting-star star-5" />
          <div className="shooting-star star-6" />
          <div className="shooting-star-rare star-13" />
          <div className="shooting-star-rare star-14" />
        </div>
      </div>
      <Background
        color={`rgba(240, 192, 80, ${Math.max(0, Math.min(0.2, (zoom - 0.15) * 0.25)).toFixed(2)})`}
        variant={BackgroundVariant.Cross}
        gap={24}
        size={6}
      />
    </>
  );
}
