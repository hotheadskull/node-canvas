import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const appCssPath = path.resolve('src/App.css');
const appTsxPath = path.resolve('src/App.tsx');

// Tier 1: Feature Coverage (F1)
test('F1-1: CSS custom property --background is defined as #0a0a0c', () => {
  const content = fs.readFileSync(appCssPath, 'utf8');
  assert.ok(
    /--background:\s*#0a0a0c/.test(content),
    'Expected --background to be set to #0a0a0c in App.css'
  );
});

test('F1-2: ReactFlow canvas uses CSS background class bg-[#0a0a0c]', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /className="[^"]*bg-\[\s*#0a0a0c\s*\][^"]*"/.test(content) || /className='[^']*bg-\[\s*#0a0a0c\s*\][^']*'/.test(content),
    'Expected ReactFlow component to have className with bg-[#0a0a0c]'
  );
});

test('F1-3: Background component has correct gap and size configurations', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /gap=\{24\}/.test(content) && /size=\{2\}/.test(content),
    'Expected Background to have gap={24} and size={2} attributes'
  );
});

test('F1-4: Background variant is set to Dots in App.tsx', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /variant=\{BackgroundVariant\.Dots\}/.test(content),
    'Expected Background variant to be BackgroundVariant.Dots'
  );
});

test('F1-5: The .react-flow__bg class uses the CSS background variable', () => {
  const content = fs.readFileSync(appCssPath, 'utf8');
  assert.ok(
    /\.react-flow__bg\s*\{\s*background-color:\s*var\(--background\);?\s*\}/.test(content),
    'Expected .react-flow__bg to use var(--background)'
  );
});

// Tier 2: Boundary & Corner Cases (F1)
test('F1-Boundary-1: CSS custom property --foreground matches light slate #f8fafc', () => {
  const content = fs.readFileSync(appCssPath, 'utf8');
  assert.ok(
    /--foreground:\s*#f8fafc/.test(content),
    'Expected --foreground to be #f8fafc for high contrast'
  );
});

test('F1-Boundary-2: Body has overflow hidden to prevent background breakdown', () => {
  const content = fs.readFileSync(appCssPath, 'utf8');
  assert.ok(
    /body\s*\{[^}]*overflow:\s*hidden;?[^}]*\}/s.test(content),
    'Expected body to have overflow: hidden in App.css'
  );
});

test('F1-Boundary-3: ReactFlow canvas specifies minZoom and maxZoom bounds', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /minZoom=\{0\.1\}/.test(content) && /maxZoom=\{4\}/.test(content),
    'Expected ReactFlow to have minZoom={0.1} and maxZoom={4} bounds'
  );
});

test('F1-Boundary-4: ReactFlow controls have high contrast border definition', () => {
  const content = fs.readFileSync(appCssPath, 'utf8');
  assert.ok(
    /\.react-flow__controls\s*\{[^}]*border:\s*1px\s+solid\s+var\(--border\);?[^}]*\}/s.test(content),
    'Expected ReactFlow controls to have a border using var(--border)'
  );
});

test('F1-Boundary-5: ReactFlow attribution watermark is explicitly hidden', () => {
  const content = fs.readFileSync(appCssPath, 'utf8');
  assert.ok(
    /\.react-flow__panel\.react-flow__attribution\s*\{[^}]*display:\s*none\s*!important;?[^}]*\}/s.test(content),
    'Expected attribution watermark to be display: none !important'
  );
});
