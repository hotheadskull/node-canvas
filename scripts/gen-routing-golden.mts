// One-shot: generate core/src/routing.golden.json (Phase D corridor pass).
// Scenario: two wires from one give; a middle plate forces w1's lane to
// slide AND w2's horizontal approach to dodge -- lanes, dodges, junction
// and hops all pinned in one worked example.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routeHarness } from '../core/src/harness';

const input = [
  {
    id: 'w1',
    source: { x: 300, y: 100, side: 'right' },
    target: { x: 600, y: 320, side: 'left' },
    sourceKey: 'a:out',
    targetKey: 'b:in',
  },
  {
    id: 'w2',
    source: { x: 300, y: 100, side: 'right' },
    target: { x: 900, y: 100, side: 'left' },
    sourceKey: 'a:out',
    targetKey: 'c:in',
  },
];
const obstacles = [
  { id: 'mid', x: 380, y: 60, width: 160, height: 300 },
  { id: 'far', x: 660, y: 40, width: 160, height: 140 },
];

const routed = routeHarness(input as never, obstacles);
const out = fileURLToPath(new URL('../core/src/routing.golden.json', import.meta.url));
writeFileSync(out, JSON.stringify({ input, obstacles, routed }, null, 2) + '\n', 'utf8');
console.log('wrote', out);
