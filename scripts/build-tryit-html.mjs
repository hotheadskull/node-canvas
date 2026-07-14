// Converts docs/TRY-IT.md into docs/TRY-IT.html so it opens with a
// double-click (no markdown viewer needed). Re-run after editing the md:
//   node scripts/build-tryit-html.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const md = readFileSync(new URL('../docs/TRY-IT.md', import.meta.url), 'utf8');

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (text) =>
  escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

const lines = md.split(/\r?\n/);
const out = [];
let inList = false;
let paragraph = [];

const flushParagraph = () => {
  if (paragraph.length > 0) {
    out.push(`<p>${paragraph.map(inline).join(' ')}</p>`);
    paragraph = [];
  }
};
const closeList = () => {
  if (inList) {
    out.push('</ul>');
    inList = false;
  }
};

for (const line of lines) {
  const checklist = line.match(/^- \[ \] (.*)$/);
  const continuation = line.match(/^ {6,}(.*)$/);
  if (checklist) {
    flushParagraph();
    if (!inList) {
      out.push('<ul class="checklist">');
      inList = true;
    }
    out.push(`<li><label><input type="checkbox"> <span>${inline(checklist[1])}</span></label></li>`);
  } else if (inList && continuation && continuation[1].trim() !== '') {
    // checklist item wrapped onto the next line(s)
    out[out.length - 1] = out[out.length - 1].replace(
      '</span></label></li>',
      ` ${inline(continuation[1])}</span></label></li>`,
    );
  } else if (line.startsWith('## ')) {
    flushParagraph();
    closeList();
    out.push(`<h2>${inline(line.slice(3))}</h2>`);
  } else if (line.startsWith('# ')) {
    flushParagraph();
    closeList();
    out.push(`<h1>${inline(line.slice(2))}</h1>`);
  } else if (line.trim() === '') {
    flushParagraph();
    closeList();
  } else {
    closeList();
    paragraph.push(line.trim());
  }
}
flushParagraph();
closeList();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Node Canvas V2 — Try it out</title>
<style>
  body { max-width: 760px; margin: 2rem auto; padding: 0 1.2rem 4rem;
         font: 15px/1.65 system-ui, "Segoe UI", sans-serif;
         background: #0e0e12; color: #d5d5dc; }
  h1 { color: #f0c050; font-size: 1.5rem; }
  h2 { color: #e8e8ee; margin-top: 2rem; border-bottom: 1px solid #2a2a32;
       padding-bottom: 4px; font-size: 1.12rem; }
  code { background: #1c1c24; border-radius: 4px; padding: 1px 6px;
         font-size: 0.9em; color: #ffd999; }
  ul.checklist { list-style: none; padding-left: 0; }
  ul.checklist li { margin: 0.55rem 0; }
  ul.checklist label { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
  ul.checklist input { margin-top: 4px; accent-color: #f0c050; }
  ul.checklist input:checked + span { color: #6a6a72; text-decoration: line-through; }
  strong { color: #fff; }
</style>
</head>
<body>
${out.join('\n')}
<script>
  // remember checked items between opens
  const key = 'tryit-checks';
  const boxes = [...document.querySelectorAll('input[type=checkbox]')];
  const saved = JSON.parse(localStorage.getItem(key) ?? '[]');
  boxes.forEach((box, index) => {
    box.checked = saved.includes(index);
    box.addEventListener('change', () => {
      const checked = boxes.flatMap((candidate, i) => (candidate.checked ? [i] : []));
      localStorage.setItem(key, JSON.stringify(checked));
    });
  });
</script>
</body>
</html>
`;

writeFileSync(new URL('../docs/TRY-IT.html', import.meta.url), html);
console.log('wrote docs/TRY-IT.html');
