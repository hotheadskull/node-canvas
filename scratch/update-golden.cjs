const fs = require('fs');
const { execSync } = require('child_process');

// Compile harness.ts and routing.ts to JS so we can require it
execSync('npx tsc --skipLibCheck --esModuleInterop core/src/routing.ts core/src/harness.ts', { stdio: 'inherit' });

const { routeHarness } = require('../../core/src/harness.js');
const goldenPath = '../../core/src/routing.golden.json';
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

golden.routed = routeHarness(golden.input, golden.obstacles);
fs.writeFileSync(goldenPath, JSON.stringify(golden, null, 2) + '\n');
console.log('Golden updated');
