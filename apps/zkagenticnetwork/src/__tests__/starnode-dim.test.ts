import { describe, it, expect } from 'vitest';
import { Container } from 'pixi.js';
import { setNodeDimmed } from '@/components/grid/StarNode';

describe('setNodeDimmed', () => {
  it('dims a container to 0.4 alpha', () => {
    const container = new Container();
    container.alpha = 1.0;
    setNodeDimmed(container, true);
    expect(container.alpha).toBe(0.4);
  });

  it('restores a container to 1.0 alpha', () => {
    const container = new Container();
    container.alpha = 0.4;
    setNodeDimmed(container, false);
    expect(container.alpha).toBe(1.0);
  });
});
