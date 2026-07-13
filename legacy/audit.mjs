import fs from 'fs';
import path from 'path';

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Node.tsx'));

let count = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Update NodeResizer
  content = content.replace(/<NodeResizer([^>]+)handleClassName="[^"]+"/g, '<NodeResizer$1handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125"');

  // 2. Update Handle classes
  // Replace old handle classes with the new standardized w-3 h-3 border-[#151518] 
  // We want to keep the specific background color e.g., bg-[#a855f7]
  content = content.replace(/(<Handle[^>]*?className="[^"]*?)(w-\d\s+h-\d)([^"]*?)"/g, (match, p1, p2, p3) => {
    let newClasses = `w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125`;
    
    // Extract any existing background color (e.g., bg-[#fb923c] or bg-white)
    const bgMatch = match.match(/bg-[^\s"]+/);
    if (bgMatch) {
      newClasses += ` ${bgMatch[0]}`;
    }

    // Extract any specific positioning classes (-top-2, etc)
    const posMatch = match.match(/-(top|bottom|left|right)-2/);
    if (posMatch) {
      newClasses += ` ${posMatch[0]}`;
    }

    // Reconstruct the Handle component
    // First remove className attribute from the original match to replace it entirely
    const withoutClass = match.replace(/className="[^"]*"/, '');
    return `${withoutClass.slice(0, -1)} className="${newClasses}"`;
  });

  // 3. Update inner backgrounds from #111114 to #151518 (dark flat cosmic theme)
  content = content.replace(/bg-\[\#111114\]/g, 'bg-[#151518]');

  fs.writeFileSync(filePath, content, 'utf-8');
  count++;
}

console.log(`Audited and updated ${count} node files.`);
