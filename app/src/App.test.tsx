import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('renders and pulls ids from @node-canvas/core', () => {
    render(<App />);
    const shell = screen.getByTestId('app-shell');
    expect(shell.dataset.bootId).toMatch(/^boot_/);
  });
});
