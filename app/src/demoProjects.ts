import { createId } from '@node-canvas/core';
import type { CanvasDocument } from '@node-canvas/core';

function createDoc(name: string): CanvasDocument {
  return {
    schemaVersion: 1,
    id: createId('doc'),
    name,
    canvasMode: 'universal',
    createdAt: new Date().toISOString(),
    nodes: [],
    edges: [],
    wires: [],
    assemblies: [],
    ink: []
  };
}

export function getShortStoryDemo(): CanvasDocument {
  const doc = createDoc("Short Story Ideas");
  const n1 = { id: createId('node'), type: 'canvas', position: { x: 0, y: 0 }, data: { title: 'Premise', content: '<p>A detective who can see the last 10 seconds of a murder victim\'s life discovers a victim who saw <em>him</em> in those final seconds.</p>' } };
  const n2 = { id: createId('node'), type: 'canvas', position: { x: 300, y: -100 }, data: { title: 'Protagonist', content: '<p>Detective Aris Thorne. Cynical, tired, relies too heavily on his ability.</p>' } };
  const n3 = { id: createId('node'), type: 'canvas', position: { x: 300, y: 100 }, data: { title: 'The Victim', content: '<p>Sarah Jenks. A seemingly ordinary accountant with no known enemies.</p>' } };
  const n4 = { id: createId('node'), type: 'canvas', position: { x: 600, y: 0 }, data: { title: 'The Twist', content: '<p>Aris realizes he is the murderer from a future timeline trying to fix a catastrophic mistake.</p>' } };

  doc.nodes = [n1, n2, n3, n4];
  doc.edges = [
    { id: createId('edge'), source: n1.id, target: n2.id },
    { id: createId('edge'), source: n1.id, target: n3.id },
    { id: createId('edge'), source: n2.id, target: n4.id },
    { id: createId('edge'), source: n3.id, target: n4.id }
  ];
  return doc;
}

export function getAcademicPaperDemo(): CanvasDocument {
  const doc = createDoc("Academic Paper Structure");
  const n1 = { id: createId('node'), type: 'canvas', position: { x: 0, y: 0 }, data: { title: 'Thesis Statement', content: '<p>The integration of AI into cognitive behavioral therapy (CBT) provides measurable improvements in patient consistency, though it lacks the empathetic nuance required for trauma-heavy diagnosis.</p>' } };
  const n2 = { id: createId('node'), type: 'canvas', position: { x: -300, y: 200 }, data: { title: 'Source 1 (Smith et al. 2024)', content: '<p>Study showing 40% increase in patient homework completion when prompted by an AI assistant.</p>' } };
  const n3 = { id: createId('node'), type: 'canvas', position: { x: 0, y: 200 }, data: { title: 'Source 2 (Doe 2023)', content: '<p>Argues that therapeutic alliance is the primary driver of clinical outcomes, which AI cannot form.</p>' } };
  const n4 = { id: createId('node'), type: 'canvas', position: { x: 300, y: 200 }, data: { title: 'Source 3 (Chen 2025)', content: '<p>Meta-analysis showing AI tools excel at CBT structural exercises (thought records) but fail at complex empathetic mirroring.</p>' } };
  const n5 = { id: createId('node'), type: 'canvas', position: { x: 0, y: 400 }, data: { title: 'Synthesis / Conclusion', content: '<p>AI should be viewed as a supplemental tool for structural CBT exercises, while human therapists handle the empathetic alliance.</p>' } };

  doc.nodes = [n1, n2, n3, n4, n5];
  doc.edges = [
    { id: createId('edge'), source: n2.id, target: n1.id },
    { id: createId('edge'), source: n3.id, target: n1.id },
    { id: createId('edge'), source: n4.id, target: n1.id },
    { id: createId('edge'), source: n1.id, target: n5.id }
  ];
  return doc;
}

export function getFantasyNovelDemo(): CanvasDocument {
  const doc = createDoc("Necromancer Novel - Chapter 1");
  const n1 = { id: createId('node'), type: 'canvas', position: { x: 0, y: 0 }, data: { title: 'Scene 1: The Awakening', content: '<p>Vaelin wakes up in a shallow grave. His bones ache. He realizes the resurrection spell worked, but his soul is untethered. The earth is cold and smells like iron.</p>' } };
  const n2 = { id: createId('node'), type: 'canvas', position: { x: 400, y: -100 }, data: { title: 'Lore Note: Soul Tethering', content: '<p>A soul needs an anchor to stay in the mortal realm. Without it, Vaelin has 3 days before he becomes a wraith.</p>' } };
  const n3 = { id: createId('node'), type: 'canvas', position: { x: 400, y: 100 }, data: { title: 'Scene 2: The Ambush', content: '<p>Grave robbers dig up the adjacent plot. They spot Vaelin. He tries to cast a simple bone-splinter, but his magic is erratic.</p>' } };
  const n4 = { id: createId('node'), type: 'canvas', position: { x: 800, y: 0 }, data: { title: 'Scene 3: The Escape', content: '<p>Vaelin steals their horse, a ragged mare. He rides towards the Obsidian Spire to find the lich who cursed him.</p>' } };

  doc.nodes = [n1, n2, n3, n4];
  doc.edges = [
    { id: createId('edge'), source: n1.id, target: n2.id },
    { id: createId('edge'), source: n1.id, target: n3.id },
    { id: createId('edge'), source: n3.id, target: n4.id }
  ];
  return doc;
}
