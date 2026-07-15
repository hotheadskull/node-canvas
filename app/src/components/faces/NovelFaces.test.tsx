import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addNode,
  addWire,
  createEmptyDocument,
  serializeDocument,
  spawnNode,
} from '@node-canvas/core';
import App from '../../App';
import { useCanvasStore } from '../../store/canvasStore';
import { PayoffFace } from './NovelFaces';

beforeEach(() => {
  localStorage.clear();
  useCanvasStore.setState({ document: createEmptyDocument('reset'), persistenceError: null });
});

describe('novel pack rich faces', () => {
  it('an orphan Plant wears the flag and the amber none-yet line', async () => {
    let doc = createEmptyDocument('plant');
    const plant = spawnNode('plant', { x: 0, y: 0 });
    plant.data = { title: 'The pistol', content: '' };
    doc = addNode(doc, plant);
    localStorage.setItem('nodecanvas.v2.document', serializeDocument(doc));
    render(<App />);
    expect((await screen.findByText('Payoffs — none yet'))).toBeTruthy();
    const dot = document.querySelector('[data-hygiene-flag]')!;
    expect(dot).not.toBeNull();
    expect(dot.getAttribute('title')).toContain('feeds nothing yet');
  });

  it('wiring plant -> payoff fills both lists and clears the flag', async () => {
    let doc = createEmptyDocument('pair');
    const plant = spawnNode('plant', { x: 0, y: 0 });
    const payoff = spawnNode('payoff', { x: 700, y: 0 });
    plant.data = { title: 'The pistol', content: '' };
    payoff.data = { title: 'The shot', content: '' };
    doc = addNode(addNode(doc, plant), payoff);
    doc = addWire(doc, {
      source: plant.id,
      sourcePort: 'plant-out',
      target: payoff.id,
      targetPort: 'plants-in',
    });
    localStorage.setItem('nodecanvas.v2.document', serializeDocument(doc));
    render(<App />);
    expect((await screen.findByText('Pays off in')).nextElementSibling!.textContent).toContain(
      'The shot',
    );
    expect(document.querySelector('[data-hygiene-flag]')).toBeNull();
    // renames propagate live (derived by reference)
    useCanvasStore.getState().setNodeTitle(payoff.id, 'The bang');
    expect((await screen.findByText('Pays off in')).nextElementSibling!.textContent).toContain(
      'The bang',
    );
  });

  // face rendered directly: jsdom RF culls off-origin nodes; e2e covers the
  // on-canvas render
  it('Payoff face lists the plants it resolves', async () => {
    let doc = createEmptyDocument('pair');
    const plant = spawnNode('plant', { x: 0, y: 0 });
    const payoff = spawnNode('payoff', { x: 0, y: 300 });
    plant.data = { title: 'The pistol', content: '' };
    payoff.data = { title: 'The shot', content: '' };
    doc = addNode(addNode(doc, plant), payoff);
    doc = addWire(doc, {
      source: plant.id,
      sourcePort: 'plant-out',
      target: payoff.id,
      targetPort: 'plants-in',
    });
    useCanvasStore.setState({ document: doc });
    render(<PayoffFace nodeId={payoff.id} title="The shot" content="" />);
    expect((await screen.findByText('Resolves')).nextElementSibling!.textContent).toContain(
      'The pistol',
    );
  });

  it('Event: story time edits persist, involves chips read wire role labels', async () => {
    let doc = createEmptyDocument('events');
    // ALL nodes sit exactly at the origin: jsdom measures everything 1x1,
    // so onlyRenderVisibleElements culls any node whose rect misses (0,0)
    // (surfaced when the Tab Card anatomy stopped forcing inline heights)
    const wedding = spawnNode('event', { x: 0, y: 0 });
    const duel = spawnNode('event', { x: 0, y: 0 });
    const anna = spawnNode('person', { x: 0, y: 0 });
    wedding.data = { title: 'The wedding', content: '', storyTime: 14.2 };
    duel.data = { title: 'The duel', content: '', storyTime: 3.5 };
    anna.data = { title: 'Anna', content: '' };
    doc = addNode(addNode(addNode(doc, wedding), duel), anna);
    doc = addWire(doc, {
      source: anna.id,
      sourcePort: 'identity-out',
      target: wedding.id,
      targetPort: 'involves-in',
    });
    localStorage.setItem('nodecanvas.v2.document', serializeDocument(doc));
    render(<App />);

    // role label lives on the wire
    const wireId = useCanvasStore.getState().document.wires[0]!.id;
    useCanvasStore.getState().setWireLabel(wireId, 'bride');
    expect((await screen.findByText('Anna · bride'))).toBeTruthy();

    // both dated events draw the shared mini timeline; the wedding's own dot
    // is emphasized. waitFor: the second node's face can mount a beat later
    // than the first (this was an order-dependent flake).
    await waitFor(() => {
      expect(document.querySelectorAll('[data-event-timeline]').length).toBe(2);
    });
    const timelines = document.querySelectorAll('[data-event-timeline]');
    expect(timelines[0]!.querySelectorAll('.event-dot').length).toBe(2);
    expect(document.querySelectorAll('.event-dot.is-self').length).toBe(2);

    // editing story time writes through to the document
    const inputs = screen.getAllByLabelText('Story time');
    fireEvent.change(inputs[0]!, { target: { value: '15' } });
    const stored = useCanvasStore
      .getState()
      .document.nodes.find((node) => node.id === wedding.id)!;
    expect(stored.data['storyTime']).toBe(15);
    // clearing removes the field entirely (no nulls in the file)
    fireEvent.change(inputs[0]!, { target: { value: '' } });
    const cleared = useCanvasStore
      .getState()
      .document.nodes.find((node) => node.id === wedding.id)!;
    expect('storyTime' in cleared.data).toBe(false);
  });
});
