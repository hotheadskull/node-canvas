import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

beforeEach(() => localStorage.clear());

describe('App shell', () => {
  it('boots the canvas with toolbar (bottom-left) and legend (bottom-right)', async () => {
    render(<App />);
    expect(screen.getByTestId('app-shell')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /add node/i })).toBeTruthy();
    expect(screen.getByLabelText('Node type legend')).toBeTruthy();
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
