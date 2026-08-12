import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  allMenuTypes,
  coreMenuTypes,
  getNodeDef,
  isRegisteredType,
  NODE_TYPE_DEFS,
  nodeLabel,
} from './registry';

const CORE_NINE = ['title', 'note', 'brainstorm', 'document', 'section', 'question', 'person', 'place', 'thing'];
const MODES = ['universal', 'novel', 'sermon'] as const;

describe('universal core registry', () => {
  it('registers exactly the core nine in the compact menu', () => {
    expect(coreMenuTypes().map((def) => def.type)).toEqual(CORE_NINE);
  });

  it('every type has labels and descriptions for every canvas mode', () => {
    for (const def of NODE_TYPE_DEFS) {
      for (const mode of MODES) {
        expect(def.labels[mode], `${def.type} label (${mode})`).toBeTruthy();
        expect(def.descriptions[mode], `${def.type} description (${mode})`).toBeTruthy();
      }
    }
  });

  it('per-mode labels translate core nodes into pack vocabulary', () => {
    expect(nodeLabel('section', 'universal')).toBe('Section');
    expect(nodeLabel('section', 'novel')).toBe('Scene');
    expect(nodeLabel('section', 'sermon')).toBe('Sermon Point');
    expect(nodeLabel('unknown-type', 'universal')).toBe('unknown-type');
  });

  it('type strings are stable lookups', () => {
    for (const type of CORE_NINE) {
      expect(isRegisteredType(type)).toBe(true);
      expect(getNodeDef(type)?.type).toBe(type);
    }
    expect(isRegisteredType('ghost')).toBe(false);
  });

  it('port declarations match the pinned contract (golden)', () => {
    const golden = JSON.parse(
      readFileSync(new URL('./registry-ports.golden.json', import.meta.url), 'utf8'),
    );
    const actual = Object.fromEntries(NODE_TYPE_DEFS.map((def) => [def.type, def.ports]));
    expect(actual).toEqual(golden);
  });

  it('port discipline: at most 6 ports, at most 3 visible, takes declare capacity', () => {
    for (const def of NODE_TYPE_DEFS) {
      expect(def.ports.length, `${def.type} port count`).toBeLessThanOrEqual(6);
      const visible = def.ports.filter((port) => port.defaultVisible);
      expect(visible.length, `${def.type} visible ports`).toBeLessThanOrEqual(3);
      for (const port of def.ports) {
        expect(port.dataKind, `${def.type}.${port.id} dataKind`).toBeTruthy();
        expect(port.label, `${def.type}.${port.id} label`).toBeTruthy();
        if (port.direction === 'take') {
          expect(port.capacity, `${def.type}.${port.id} capacity`).toMatch(/^(one|many)$/);
        } else {
          expect(port.capacity, `${def.type}.${port.id} gives declare no capacity`).toBeUndefined();
        }
      }
    }
  });

  it('manuscript (spine level 3) is reserved: registered, out of the core menu, reachable in All', () => {
    expect(isRegisteredType('manuscript')).toBe(true);
    expect(coreMenuTypes().some((def) => def.type === 'manuscript')).toBe(false);
    const allTypes = allMenuTypes().flatMap((group) => group.types.map((def) => def.type));
    expect(allTypes).toContain('manuscript');
    expect(getNodeDef('manuscript')!.ports.map((port) => port.id)).toEqual([
      'documents-in',
      'compiled-out',
      'thread-in',
      'notes-in',
    ]);
  });

  it('the All view groups every registered type -- packs never gate (I11)', () => {
    const grouped = allMenuTypes().flatMap((group) => group.types.map((def) => def.type));
    expect(grouped.sort()).toEqual(NODE_TYPE_DEFS.map((def) => def.type).sort());
  });
});
