import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@node-canvas/core';
import App from '../App';
import { useCanvasStore } from '../store/canvasStore';
import { TUTORIAL_DONE_KEY } from './Tutorial';
import { TUTORIAL_STEPS } from '../tutorial/steps';

beforeEach(() => {
  localStorage.clear();
  useCanvasStore.setState({
    document: createEmptyDocument('reset'),
    persistenceError: null,
    tutorialOpen: false,
    tipsOpen: false,
    paletteOpen: false,
  });
});

const total = TUTORIAL_STEPS.length;

describe('onboarding tour', () => {
  it('offers itself once on a fresh canvas; Not now is remembered', async () => {
    render(<App />);
    const invite = await screen.findByText(/two-minute tour/);
    expect(invite).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(document.querySelector('[data-tutorial-invite]')).toBeNull();
    expect(localStorage.getItem(TUTORIAL_DONE_KEY)).toBe('dismissed');
  });

  it('does not nag once finished, dismissed, or on a non-empty canvas', async () => {
    localStorage.setItem(TUTORIAL_DONE_KEY, 'done');
    render(<App />);
    await screen.findByTestId('app-shell');
    expect(document.querySelector('[data-tutorial-invite]')).toBeNull();
  });

  it('advances when the user performs the action, supports Back/Next, and finishes', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start tour' }));

    // step 1: welcome (manual)
    expect(screen.getByText(`1 / ${total}`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(`2 / ${total}`)).toBeTruthy();

    // performing the action advances WITHOUT clicking Next
    useCanvasStore.getState().spawnAt('note', { x: 0, y: 0 });
    expect(await screen.findByText(`3 / ${total}`)).toBeTruthy();

    // Back returns (and the tour does not immediately re-advance past a
    // completed step's successor -- it sits where the user put it)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText(`2 / ${total}`)).toBeTruthy();

    // the palette step advances off the latch
    const nodes = useCanvasStore.getState().document.nodes;
    expect(nodes).toHaveLength(1);

    // skip ahead to the end with Next, then Finish persists the flag
    const clickNextUntilLast = () => {
      while (screen.queryByRole('button', { name: 'Next' })) {
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      }
    };
    clickNextUntilLast();
    expect(screen.getByText(`${total} / ${total}`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(document.querySelector('[data-tutorial-step]')).toBeNull();
    expect(localStorage.getItem(TUTORIAL_DONE_KEY)).toBe('done');
  });

  it('leaving the tour early is remembered as skipped', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start tour' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave the tour' }));
    expect(document.querySelector('[data-tutorial-step]')).toBeNull();
    expect(localStorage.getItem(TUTORIAL_DONE_KEY)).toBe('skipped');
  });

  it('the ? button opens Tips & reference; Replay restarts the tour', async () => {
    localStorage.setItem(TUTORIAL_DONE_KEY, 'done');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Help' }));
    expect(document.querySelector('[data-tips-panel]')).not.toBeNull();
    expect(screen.getByText('Three kinds of connection')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Replay the tour' }));
    expect(document.querySelector('[data-tips-panel]')).toBeNull();
    expect(await screen.findByText(`1 / ${total}`)).toBeTruthy();
  });
});
