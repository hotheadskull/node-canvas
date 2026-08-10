// Regenerate core/src/harness.golden.json ROUTED output from its own
// stored input (the input is the fixture and never changes here).
// Run after a deliberate harness behavior change, commit with
// INVARIANT-CHANGE-APPROVED.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routeHarness, type HarnessWireInput } from '../core/src/harness';

const path = fileURLToPath(new URL('../core/src/harness.golden.json', import.meta.url));
const golden = JSON.parse(readFileSync(path, 'utf8'));
golden.routed = routeHarness(golden.input as HarnessWireInput[]);
writeFileSync(path, JSON.stringify(golden, null, 2) + '\n', 'utf8');
console.log('wrote', path);
