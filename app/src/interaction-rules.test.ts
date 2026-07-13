// Interaction-robustness rules, enforced against source (the v1 lessons that
// are hard to render in jsdom). See docs/ui-interaction-rules.md.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('I5: the canvas never moves the view on its own', () => {
  const canvas = read('./Canvas.tsx');

  it('ReactFlow gets no fitView prop -- viewport comes from persisted state', () => {
    expect(canvas).not.toMatch(/fitView[:=]/);
    expect(canvas).toContain('defaultViewport={initialViewport}');
  });

  it('fit-to-view exists only as an explicit toolbar button', () => {
    const toolbar = read('./components/Toolbar.tsx');
    expect(toolbar).toContain('fitView(');
    expect(toolbar).toContain('onClick');
  });
});

describe('edge clickability (the v1 "works on my machine" bug)', () => {
  const edge = read('./components/PlainEdge.tsx');

  it('edges render a zoom-compensated interaction path, never just the stroke', () => {
    expect(edge).toContain('interactionWidth');
    expect(edge).toMatch(/24\s*\/\s*Math\.max\(zoom/);
  });

  it('edges carry a second, always-clickable affordance (the label chip)', () => {
    expect(edge).toContain('EdgeLabelRenderer');
    expect(edge).toContain('edge-chip');
  });

  it('the chip is real DOM with pointer events enabled', () => {
    const styles = read('./styles.css');
    expect(styles).toMatch(/\.edge-chip\s*\{[^}]*pointer-events:\s*all/s);
  });
});

describe('connection accessibility requirements', () => {
  const canvas = read('./Canvas.tsx');

  it('loose connection mode and a generous connection radius', () => {
    expect(canvas).toContain('ConnectionMode.Loose');
    expect(canvas).toMatch(/connectionRadius=\{40\}/);
  });

  it('nodeTypes/edgeTypes are module-level constants (perf rule)', () => {
    expect(canvas).toMatch(/const nodeTypes = \{/);
    expect(canvas).toMatch(/const edgeTypes = \{/);
    expect(canvas.indexOf('const nodeTypes')).toBeLessThan(canvas.indexOf('export function Canvas'));
  });

  it('handles keep an invisible hit area larger than the visible dot', () => {
    const styles = read('./styles.css');
    expect(styles).toMatch(/\.node-handle\.react-flow__handle::after\s*\{[^}]*inset:\s*-7px/s);
  });
});
