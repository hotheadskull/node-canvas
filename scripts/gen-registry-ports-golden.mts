// One-shot: regenerate core/src/registry-ports.golden.json from the live
// registry. Run ONLY when the port contract deliberately changes (the
// commit needs INVARIANT-CHANGE-APPROVED); pt2 handoff 2026-08-10 added
// notes-in everywhere, source.clip, passage.cite, and the hub type.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NODE_TYPE_DEFS } from '../core/src/registry';

const actual = Object.fromEntries(NODE_TYPE_DEFS.map((def) => [def.type, def.ports]));
const out = fileURLToPath(new URL('../core/src/registry-ports.golden.json', import.meta.url));
writeFileSync(out, JSON.stringify(actual, null, 2) + '\n');
console.log('registry-ports.golden.json regenerated:', Object.keys(actual).length, 'types');
