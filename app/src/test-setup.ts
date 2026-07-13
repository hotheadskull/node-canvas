// jsdom mocks required by @xyflow/react (per xyflow testing docs), plus RTL
// cleanup (vitest globals are off, so RTL cannot register it by itself).

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

class ResizeObserverMock {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyMock {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.])\)/)?.[1];
    this.m22 = scale !== undefined ? +scale : 1;
  }
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
// @ts-expect-error partial mock is sufficient for xyflow
globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyMock;

Object.defineProperties(globalThis.HTMLElement.prototype, {
  offsetHeight: {
    get() {
      return parseFloat((this as HTMLElement).style.height) || 1;
    },
  },
  offsetWidth: {
    get() {
      return parseFloat((this as HTMLElement).style.width) || 1;
    },
  },
});

(globalThis.SVGElement.prototype as unknown as { getBBox: () => object }).getBBox = () => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

globalThis.window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
