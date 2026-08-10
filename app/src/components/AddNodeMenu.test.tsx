import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NODE_TYPE_DEFS } from '@node-canvas/core';
import { AddNodeMenu } from './AddNodeMenu';

// The pt2 add sheet (user, 2026-08-10): five families, no Core/All split.
// Every registered type is directly reachable the moment the sheet opens.
describe('add-node sheet', () => {
  it('every registered type is reachable with no view switching (I11)', () => {
    render(<AddNodeMenu onPick={() => {}} onClose={() => {}} />);
    for (const def of NODE_TYPE_DEFS) {
      expect(document.querySelector(`[data-node-type="${def.type}"]`)).not.toBeNull();
    }
  });

  it('hovering a tile fills the preview panel', () => {
    render(<AddNodeMenu onPick={() => {}} onClose={() => {}} />);
    fireEvent.mouseEnter(document.querySelector('[data-node-type="section"]')!);
    expect(document.querySelector('[data-preview-for="section"]')).not.toBeNull();
  });

  it('clicking a tile picks that type', () => {
    const onPick = vi.fn();
    render(<AddNodeMenu onPick={onPick} onClose={() => {}} />);
    fireEvent.click(document.querySelector('[data-node-type="question"]')!);
    expect(onPick).toHaveBeenCalledWith('question');
  });

  it('the Group shortcut tile stays disabled without a 2+ selection', () => {
    const onGather = vi.fn();
    const { unmount } = render(
      <AddNodeMenu onPick={() => {}} onClose={() => {}} selectedCount={1} onGather={onGather} />,
    );
    const disabled = screen.getByRole('button', { name: /^Group$/ });
    expect((disabled as HTMLButtonElement).disabled).toBe(true);
    unmount();

    render(
      <AddNodeMenu onPick={() => {}} onClose={() => {}} selectedCount={3} onGather={onGather} />,
    );
    const enabled = screen.getByRole('button', { name: /^Group 3$/ });
    fireEvent.click(enabled);
    expect(onGather).toHaveBeenCalled();
  });
});
