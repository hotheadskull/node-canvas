import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

beforeEach(() => localStorage.clear());

describe('App shell', () => {
  it('boots the canvas: Add node top-left, toolbar bottom-left, NO legend (I6 as amended)', async () => {
    render(<App />);
    expect(screen.getByTestId('app-shell')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /add node/i })).toBeTruthy();
    expect(document.querySelector('.toolbar-add .toolbar-button')).not.toBeNull();
    expect(screen.queryByLabelText('Node type legend')).toBeNull();
  });

  it('shows no error banner on a clean boot', () => {
    render(<App />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('surfaces a broken saved document as a banner (I9)', () => {
    localStorage.setItem('nodecanvas.v2.document', 'garbage{');
    render(<App />);
    expect(screen.getByRole('alert').textContent).toContain('could not be loaded');
  });
});
