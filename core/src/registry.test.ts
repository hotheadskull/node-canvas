import { describe, expect, it } from 'vitest';
import {
  allMenuTypes,
  coreMenuTypes,
  getNodeDef,
  isRegisteredType,
  NODE_TYPE_DEFS,
  nodeLabel,
} from './registry';

const CORE_EIGHT = ['title', 'note', 'document', 'section', 'question', 'person', 'place', 'thing'];
const MODES = ['universal', 'novel', 'sermon'] as const;

describe('universal core registry', () => {
  it('registers exactly the core eight in the compact menu', () => {
    expect(coreMenuTypes().map((def) => def.type)).toEqual(CORE_EIGHT);
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
    for (const type of CORE_EIGHT) {
      expect(isRegisteredType(type)).toBe(true);
      expect(getNodeDef(type)?.type).toBe(type);
    }
    expect(isRegisteredType('ghost')).toBe(false);
  });

  it('every def declares a ports array (skeleton for Chunk 3)', () => {
    for (const def of NODE_TYPE_DEFS) {
      expect(Array.isArray(def.ports)).toBe(true);
    }
  });

  it('the All view groups every registered type -- packs never gate (I11)', () => {
    const grouped = allMenuTypes().flatMap((group) => group.types.map((def) => def.type));
    expect(grouped.sort()).toEqual(NODE_TYPE_DEFS.map((def) => def.type).sort());
  });
});
