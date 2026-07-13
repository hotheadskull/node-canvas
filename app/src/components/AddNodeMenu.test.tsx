import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { coreMenuTypes } from '@node-canvas/core';
import { AddNodeMenu } from './AddNodeMenu';

beforeEach(() => localStorage.clear());

describe('add-node gallery menu', () => {
  it('renders a miniature card for every core type, from the registry', () => {
    render(<AddNodeMenu onPick={() => {}} onClose={() => {}} />);
    for (const def of coreMenuTypes()) {
      expect(document.querySelector(`[data-node-type="${def.type}"]`)).not.toBeNull();
    }
  });

  it('hovering a card fills the preview panel with its Known-as names', () => {
    render(<AddNodeMenu onPick={() => {}} onClose={() => {}} />);
    fireEvent.mouseEnter(document.querySelector('[data-node-type="section"]')!);
    expect(document.querySelector('[data-preview-for="section"]')).not.toBeNull();
    expect(screen.getByText('Scene')).toBeTruthy();
    expect(screen.getByText('Sermon Point')).toBeTruthy();
  });

  it('clicking a card picks that type', () => {
    const onPick = vi.fn();
    render(<AddNodeMenu onPick={onPick} onClose={() => {}} />);
    fireEvent.click(document.querySelector('[data-node-type="question"]')!);
    expect(onPick).toHaveBeenCalledWith('question');
  });

  it('remembers the Core/All view across opens', () => {
    const { unmount } = render(<AddNodeMenu onPick={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    unmount();
    render(<AddNodeMenu onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('tab', { name: 'All' }).getAttribute('aria-selected')).toBe('true');
  });
});
