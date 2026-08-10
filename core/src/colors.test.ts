import { describe, expect, it } from 'vitest';
import { DATA_KIND_STYLES, dataKindStyle, STATE_COLORS } from './colors';
import { NODE_TYPE_DEFS } from './registry';

// The Observatory color law: colour comes from the port's dataKind, never
// the node's type. These tests pin the table to the registry so a pack can
// never ship a port the visual system doesn't know how to draw.
describe('data-kind color law', () => {
  it('every dataKind used by any registered port has a style', () => {
    for (const def of NODE_TYPE_DEFS) {
      for (const port of def.ports) {
        expect(DATA_KIND_STYLES[port.dataKind], `${def.type}.${port.id}`).toBeDefined();
      }
    }
  });

  it('hues are unique -- two kinds may never share a colour', () => {
    const hues = Object.values(DATA_KIND_STYLES).map((style) => style.hue);
    expect(new Set(hues).size).toBe(hues.length);
  });

  it("an 'any' port adopts its partner's colour; alone it stays neutral", () => {
    expect(dataKindStyle('any', 'claim')).toEqual(DATA_KIND_STYLES.claim);
    expect(dataKindStyle('any')).toEqual(DATA_KIND_STYLES.any);
    expect(dataKindStyle('any', 'any')).toEqual(DATA_KIND_STYLES.any);
    // a concrete kind never defers to a partner
    expect(dataKindStyle('text', 'person')).toEqual(DATA_KIND_STYLES.text);
  });

  it('handoff literals hold for the load-bearing kinds', () => {
    // pt2 handoff (2026-08-10) brightened all eleven hues; strokes and
    // dashes are unchanged
    expect(DATA_KIND_STYLES.text).toEqual({ hue: '#2dd4bf', stroke: 1.9 });
    expect(DATA_KIND_STYLES.thread).toEqual({ hue: '#e287df', stroke: 2.2 });
    expect(DATA_KIND_STYLES.cite.dash).toBe('1 4');
    expect(STATE_COLORS.conflict).toBe('#ff6a58');
  });
});
