import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addNode,
  addWire,
  createAssembly,
  createEmptyDocument,
  serializeDocument,
  setAssemblyCollapsed,
  setWireRelation,
  spawnNode,
  type CanvasDocument,
} from '@node-canvas/core';
import App from '../App';
import { useCanvasStore } from '../store/canvasStore';

/** Three propositions in an assembly: ground -> main (G), exp -> ground (Id/Exp). */
function seedArcGroup(): { doc: CanvasDocument; assemblyId: string; ids: string[] } {
  let doc = createEmptyDocument('arc');
  const main = spawnNode('proposition', { x: 0, y: 0 });
  const ground = spawnNode('proposition', { x: 0, y: 400 });
  const exp = spawnNode('proposition', { x: 0, y: 800 });
  main.data = { title: '', content: '<p>present your bodies</p>' };
  ground.data = { title: '', content: '<p>by the mercies of God</p>' };
  exp.data = { title: '', content: '<p>which is true worship</p>' };
  doc = addNode(addNode(addNode(doc, main), ground), exp);
  doc = addWire(doc, {
    source: ground.id,
    sourcePort: 'prop-out',
    target: main.id,
    targetPort: 'arc-in',
  });
  doc = setWireRelation(doc, doc.wires[doc.wires.length - 1]!.id, 'ground');
  doc = addWire(doc, {
    source: exp.id,
    sourcePort: 'prop-out',
    target: ground.id,
    targetPort: 'arc-in',
  });
  doc = setWireRelation(doc, doc.wires[doc.wires.length - 1]!.id, 'idea-explanation');
  const created = createAssembly(doc, 'Romans arc', [main.id, ground.id, exp.id], { x: 0, y: -200 });
  doc = setAssemblyCollapsed(created.document, created.assemblyId, true);
  localStorage.setItem('nodecanvas.v2.document', serializeDocument(doc));
  return { doc, assemblyId: created.assemblyId, ids: [main.id, ground.id, exp.id] };
}

beforeEach(() => {
  localStorage.clear();
  useCanvasStore.setState({
    document: createEmptyDocument('reset'),
    persistenceError: null,
    arcRoomId: null,
    arcRoomView: 'arc',
    drillStack: [],
  });
});

// React Flow wraps its nodes aria-hidden in jsdom (no measurement pass), so
// accessible-name queries can't reach face buttons here -- e2e covers the
// real-browser names; unit tests address them by attribute.
const arcRoomButton = () =>
  document.querySelector('button[aria-label="Open Arc room"]') as HTMLButtonElement | null;

async function findArcRoomButton(): Promise<HTMLButtonElement> {
  return await new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      const el = arcRoomButton();
      if (el) return resolve(el);
      if (Date.now() - started > 2000) return reject(new Error('Arc room button never rendered'));
      setTimeout(poll, 20);
    };
    poll();
  });
}

describe('Arc group face (design A: finished outline on the canvas)', () => {
  it('an assembly holding >= 2 propositions derives the outline on its face', async () => {
    seedArcGroup();
    render(<App />);
    const outline = await screen.findByText('by the mercies of God', {
      selector: '.arc-face-sub',
    });
    expect(outline).toBeTruthy();
    const main = document.querySelector('.arc-face-main')!;
    expect(main.textContent).toContain('present your bodies');
    // subordination codes ride the outline rows
    expect(document.querySelector('[data-arc-outline]')!.textContent).toContain('G');
    expect(screen.getByText(/1 main point · 2 arcs/)).toBeTruthy();
    expect(arcRoomButton()).not.toBeNull();
  });

  it('ordinary groups show no arc outline and no Arc room button', async () => {
    let doc = createEmptyDocument('plain');
    const a = spawnNode('note', { x: 0, y: 0 });
    const b = spawnNode('note', { x: 0, y: 400 });
    doc = addNode(addNode(doc, a), b);
    const created = createAssembly(doc, 'Notes', [a.id, b.id], { x: 0, y: -200 });
    doc = setAssemblyCollapsed(created.document, created.assemblyId, true);
    localStorage.setItem('nodecanvas.v2.document', serializeDocument(doc));
    render(<App />);
    await screen.findByTestId('app-shell');
    expect(document.querySelector('[data-arc-outline]')).toBeNull();
    expect(arcRoomButton()).toBeNull();
  });
});

describe('Arc room (design B: the workspace overlay)', () => {
  it('opens from the face button, stacks propositions in reading order, Esc closes', async () => {
    seedArcGroup();
    render(<App />);
    fireEvent.click(await findArcRoomButton());
    const room = document.querySelector('[data-arc-room]')!;
    expect(room).not.toBeNull();
    const rows = [...document.querySelectorAll('[data-arc-row]')];
    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain('present your bodies');
    expect(rows[1]!.textContent).toContain('by the mercies of God');
    // brackets carry the codes in Arc view
    expect(document.querySelector('.arc-room-brackets')!.textContent).toContain('G');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('[data-arc-room]')).toBeNull();
  });

  it('re-anchoring via the serves select replaces the outgoing arc wire', async () => {
    const { ids } = seedArcGroup();
    const [main, , exp] = ids;
    render(<App />);
    fireEvent.click(await findArcRoomButton());
    // exp currently serves ground; re-anchor it to main
    const serves = screen.getByLabelText(/Anchor for which is true worship/, { selector: 'select' });
    fireEvent.change(serves, { target: { value: main } });
    const doc = useCanvasStore.getState().document;
    const outgoing = doc.wires.filter(
      (wire) => wire.source === exp && wire.targetPort === 'arc-in' && wire.status === 'live',
    );
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]!.target).toBe(main);
    // the relation select follows the (new) wire
    const relation = screen.getByLabelText(/Relationship for which is true worship/, {
      selector: 'select',
    });
    fireEvent.change(relation, { target: { value: 'inference' } });
    expect(
      useCanvasStore.getState().document.wires.find((wire) => wire.source === exp)?.relation,
    ).toBe('inference');
  });

  it('the Phrasing toggle indents rows by subordination level', async () => {
    const { ids } = seedArcGroup();
    render(<App />);
    fireEvent.click(await findArcRoomButton());
    fireEvent.click(screen.getByRole('tab', { name: 'Phrasing' }));
    const rowOf = (id: string) =>
      document.querySelector(`[data-arc-row="${id}"]`) as HTMLElement;
    expect(rowOf(ids[0]!).style.paddingLeft).toBe('0px'); // main
    expect(rowOf(ids[1]!).style.paddingLeft).toBe('32px'); // ground, level 1
    expect(rowOf(ids[2]!).style.paddingLeft).toBe('64px'); // exp, level 2
    expect(document.querySelector('.arc-room-brackets')).toBeNull();
  });
});

describe('phrasing strips (design C: drill into an Arc group)', () => {
  it('drilled propositions render as indented strips at derived display positions', async () => {
    const { doc, assemblyId, ids } = seedArcGroup();
    render(<App />);
    await screen.findByTestId('app-shell');
    useCanvasStore.getState().drillIn(assemblyId);
    const assembly = doc.assemblies.find((candidate) => candidate.id === assemblyId)!;
    const strip = await new Promise<HTMLElement>((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        const el = document.querySelector(`.phrasing-node[data-id="${ids[1]}"]`);
        if (el) return resolve(el as HTMLElement);
        if (Date.now() - started > 2000) return reject(new Error('phrasing strip never rendered'));
        setTimeout(poll, 20);
      };
      poll();
    });
    // level 1 -> indented one step right of the assembly origin, not at its
    // stored position (display-only; the document position is untouched)
    expect(strip.style.transform).toContain(`${assembly.position.x + 72}px`);
    const stored = useCanvasStore
      .getState()
      .document.nodes.find((node) => node.id === ids[1])!.position;
    expect(stored).toEqual({ x: 0, y: 400 });
  });
});
