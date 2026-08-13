// The ground -- a real night sky (pt2 handoff §1). Fourteen layers:
// a navy sky gradient, a Milky Way band with a core, a warm cast, a great
// rift and dust knots (all in CANVAS space -- it pans and zooms with the
// world), five star-tile layers at coprime sizes (SCREEN space -- they pan
// for parallax but never zoom), and the 24px work grid on top.
//
// Rules the ground obeys (literal from the handoff):
// - Nothing cycles under 60 seconds; the slowest layer takes 1100s.
// - ~460 stars total; radii use rnd()*rnd() to bias hard toward small.
// - Stars draw from eight colours weighted toward white and blue-white.
// - Tile sizes 613/719/827/953/1097 are coprime -- the pattern takes
//   hours to repeat; each layer drifts exactly one tile per cycle.
// - Only transform animates. No filter or background-position animation.
//   (Gradients are BAKED into the SVG tiles -- the legacy lesson: a CSS
//   filter on a full-viewport repeating layer rasterizes brutally.)
// - The shooting stars are CUT: a real sky does not fire one every
//   thirty seconds, and they pulled the eye off the wires.

import { Background, BackgroundVariant, useViewport } from '@xyflow/react';
import { useMemo } from 'react';

/** Eight star colours, weighted toward white and blue-white with a few
 * warm -- pure #fff everywhere reads as pixels. */
const STAR_COLORS = [
  '#ffffff', '#ffffff', '#f4f6ff', '#f4f6ff', '#e8ecff', '#dfe8ff',
  '#cdd8ff', '#bcd0ff', '#ffe9d6', '#ffd9b8',
];

function starColor(): string {
  return STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]!;
}

/** One magnitude layer: `count` stars per `w`×`h` tile, radius biased
 * small via rnd()*rnd(), alpha in [aMin, aMax]. Edge stars are cloned to
 * the opposite side so the repeat can never show a seam. */
function generateMagTile(
  w: number,
  h: number,
  count: number,
  rMin: number,
  rMax: number,
  aMin: number,
  aMax: number,
): string {
  let rects = '';
  const add = (cx: number, cy: number, r: number, color: string, alpha: string) => {
    const size = Math.max(1, Math.round(r * 2));
    const x = Math.round(cx - size / 2);
    const y = Math.round(cy - size / 2);
    rects += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}" opacity="${alpha}"/>`;
  };
  for (let i = 0; i < count; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const r = rMin + (rMax - rMin) * (Math.random() * Math.random());
    const alpha = (aMin + Math.random() * (aMax - aMin)).toFixed(2);
    const color = starColor();
    add(cx, cy, r, color, alpha);
    if (cx - r < 0) add(cx + w, cy, r, color, alpha);
    if (cx + r > w) add(cx - w, cy, r, color, alpha);
    if (cy - r < 0) add(cx, cy + h, r, color, alpha);
    if (cy + r > h) add(cx, cy - h, r, color, alpha);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** The five magnitude layers (handoff table rows 8-12): count per tile,
 * radius and alpha ranges, drift cycle, and parallax pan fraction. */
const MAG_LAYERS = [
  { w: 613, h: 431, count: 86, rMin: 0.55, rMax: 1.15, aMin: 0.24, aMax: 0.48, cycle: 1100, pan: 0.2 },
  { w: 719, h: 509, count: 74, rMin: 0.6, rMax: 1.3, aMin: 0.34, aMax: 0.64, cycle: 820, pan: 0.35 },
  { w: 827, h: 587, count: 58, rMin: 0.7, rMax: 1.6, aMin: 0.48, aMax: 0.84, cycle: 600, pan: 0.5 },
  { w: 953, h: 673, count: 34, rMin: 0.85, rMax: 1.95, aMin: 0.64, aMax: 0.96, cycle: 460, pan: 0.65 },
  { w: 1097, h: 761, count: 18, rMin: 1.1, rMax: 2.3, aMin: 0.78, aMax: 1, cycle: 380, pan: 0.8 },
] as const;

/** The Milky Way band -- glow, core, warm cast, second cloud, 190 band
 * stars, the great rift and two dust knots, all rotated -9° in one SVG.
 * The handoff's blur values become soft radial-gradient falloffs so no
 * filter ever runs at paint time. */
const BAND_W = 2400;
const BAND_H = 1200;

function generateBandSVG(): string {
  const cx = BAND_W / 2;
  const cy = BAND_H / 2;
  // elliptical soft blobs approximating "ellipse + blur"
  const blob = (
    id: string,
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
    alpha: number,
  ) => ({
    def: `<radialGradient id="${id}"><stop offset="0%" stop-color="${color}" stop-opacity="${alpha}"/><stop offset="55%" stop-color="${color}" stop-opacity="${(alpha * 0.45).toFixed(3)}"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
    shape: `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`,
  });
  // the band spine runs x 100..2300 through the tile center; feature
  // positions are fractions ALONG it (handoff: core 46%, warm 44%, second
  // cloud 64%), sizes literal
  const along = (t: number) => 100 + t * (BAND_W - 200);
  const parts = [
    blob('bandglow', cx, cy, 900, 210, 'rgb(108,138,208)', 0.4),
    blob('core', along(0.46), cy, 475, 170, 'rgb(186,190,228)', 0.44),
    blob('warmcore', along(0.44), cy, 280, 120, 'rgb(214,178,180)', 0.42),
    blob('cloud2', along(0.64), cy, 310, 125, 'rgb(130,158,222)', 0.34),
    blob('rift', cx, cy + 12, 700, 50, 'rgb(20,14,22)', 0.94),
    blob('knot1', along(0.43), cy - 14, 180, 80, 'rgb(18,12,20)', 0.9),
    blob('knot2', along(0.52), cy + 22, 140, 70, 'rgb(18,12,20)', 0.9),
  ];
  // 190 stars packed ON the band: uniform along it, gaussian across it
  let bandStars = '';
  for (let i = 0; i < 190; i++) {
    const x = 120 + Math.random() * (BAND_W - 240);
    // sum of three uniforms ≈ gaussian, sigma ~80px across the width
    const y = cy + (Math.random() + Math.random() + Math.random() - 1.5) * 110;
    const r = 0.4 + 1.3 * (Math.random() * Math.random());
    const alpha = (0.3 + Math.random() * 0.55).toFixed(2);
    bandStars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${starColor()}" opacity="${alpha}"/>`;
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAND_W}" height="${BAND_H}">` +
    `<defs>${parts.map((part) => part.def).join('')}</defs>` +
    `<g transform="rotate(-9 ${cx} ${cy})">${parts.map((part) => part.shape).join('')}${bandStars}</g>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function Starfield() {
  const { x, y, zoom } = useViewport();
  const band = useMemo(() => generateBandSVG(), []);
  const magTiles = useMemo(
    () =>
      MAG_LAYERS.map((layer) =>
        generateMagTile(
          layer.w,
          layer.h,
          layer.count,
          layer.rMin,
          layer.rMax,
          layer.aMin,
          layer.aMax,
        ),
      ),
    [],
  );

  return (
    <>
      {/* layer 0: the sky is NAVY, not black -- the blue is what makes the
          dust lanes read as brown rather than as holes */}
      <div className="starfield-void" />
      {/* layers 1-7: the band lives in CANVAS space -- it pans with the
          world and zoom scales it; centered on the world origin */}
      <div
        className="sky-band-space"
        style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})` }}
      >
        <div
          className="sky-band"
          style={{
            left: -BAND_W / 2,
            top: -BAND_H / 2,
            width: BAND_W,
            height: BAND_H,
            backgroundImage: `url('${band}')`,
          }}
        />
      </div>
      {/* layers 8-12: stars live in SCREEN space -- they pan for parallax
          (20/35/50/65/80%) but never zoom, and each drifts one whole tile
          per cycle so the repeat never registers */}
      {MAG_LAYERS.map((layer, index) => (
        <div
          key={layer.w}
          className="sky-mag-layer"
          style={{
            inset: `${-layer.h}px ${-layer.w}px`,
            zIndex: -3 + (index >= 3 ? 1 : 0),
            backgroundImage: `url('${magTiles[index]}')`,
            backgroundSize: `${layer.w}px ${layer.h}px`,
            backgroundPosition: `${x * layer.pan}px ${y * layer.pan}px`,
            ['--tile-w' as string]: `${layer.w}px`,
            ['--tile-h' as string]: `${layer.h}px`,
            animationDuration: `${layer.cycle}s`,
          }}
        />
      ))}
      {/* layer 13: the work grid -- 1px dots, 24px pitch, barely there */}
      <Background
        color="rgba(255,255,255,0.06)"
        variant={BackgroundVariant.Lines}
        gap={48}
        lineWidth={1}
      />
    </>
  );
}
